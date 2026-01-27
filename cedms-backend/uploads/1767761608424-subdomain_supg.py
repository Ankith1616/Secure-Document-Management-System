#!/usr/bin/env python3
"""
Layered species + Darcy simulation (DOLFINx 0.9.0)
- Domain: [0,1] x [0,1]
- Left 40%: anode, Middle 20%: membrane (fine mesh), Right 40%: cathode
- Species balanced weak form in anode & cathode & membrane (region constants differ)
- Darcy weak form (velocity+pressure) solved in membrane region (for visualization only)
- Initial concentration of Na+: anode & membrane 0.54, cathode 1.0
- Boundary conditions: Bottom of anode c=0.54, Bottom of cathode c=1.0
- Simulate 2s with 10 timesteps; visualize mesh & concentration each step
"""

import os
import time
import json
from datetime import datetime
import psutil

import numpy as np
from mpi4py import MPI
import pyvista

import ufl
import dolfinx
from dolfinx import mesh as dmesh
from dolfinx import plot
from dolfinx import default_scalar_type as ScalarType
import dolfinx.fem as fem
from dolfinx.fem.petsc import LinearProblem
from basix.ufl import element as basix_element
from basix.ufl import mixed_element
from dolfinx.mesh import locate_entities_boundary,meshtags
# NOTE: locate_dofs_geometrical is only used internally in the corrected block
# from dolfinx.fem import locate_dofs_geometrical 


# ------------------------------
# Helper functions
# ------------------------------
def set_layered_initial_conditions(V, ion_name):
    """Set initial concentration based on x-coordinate regions"""
    c = fem.Function(V)

    def initial_concentration(x):
        conc = np.zeros(x.shape[1])
        
        if ion_name == "Na+":
            # Anode region (0 to 0.4): 0.54 M
            conc[x[0] <= 0.4] = 0.54
            # Membrane region (0.4 to 0.6): 0.54 M
            conc[(x[0] > 0.4) & (x[0] <= 0.6)] = 0.54
            # Cathode region (0.6 to 1.0): 1.0 M
            conc[x[0] > 0.6] = 1.0
           
        return conc

    c.interpolate(initial_concentration)
    return c


def create_function_space_layered(domain, degree=3):
    """Create Lagrange function space with specified degree"""
    try:
        el = basix_element("Lagrange", domain.topology.cell_name(), degree)
        V = fem.functionspace(domain, el)
    except:
        try:
            el = fem.Element("Lagrange", domain.basix_cell(), degree)
            V = fem.functionspace(domain, el)
        except:
            V = fem.functionspace(domain, ("Lagrange", degree))
    return V


def visualize_layered_solution(image_path, domain, c, title="Layered Concentration"):
    """Visualize solution with layer boundaries visible"""
    
    # Project to P1 for visualization
    try:
        el_p1 = basix_element("Lagrange", domain.topology.cell_name(), 1)
        V_p1 = fem.functionspace(domain, el_p1)
    except:
        try:
            el_p1 = fem.Element("Lagrange", domain.basix_cell(), 1)
            V_p1 = fem.functionspace(domain, el_p1)
        except:
            V_p1 = fem.functionspace(domain, ("Lagrange", 1))
    
    c_p1 = fem.Function(V_p1)
    c_p1.interpolate(c)
    
    topology, cell_types, geometry = plot.vtk_mesh(domain)
    grid = pyvista.UnstructuredGrid(topology, cell_types, geometry)
    
    # Convert to numpy array for safety
    try:
        arr = np.array(c_p1.x.array)
    except:
        arr = c_p1.x.array
    
    grid.point_data["concentration"] = arr
    
    plotter = pyvista.Plotter(window_size=(1200, 800))
    plotter.add_mesh(grid, scalars="concentration", show_edges=False,
                    scalar_bar_args={'title': 'Concentration [M]'},
                    cmap='RdBu',
                    edge_color='black',
                    line_width=0.1,
                    )
    
    height = 1.0
    
    # Anode-Membrane boundary at x=0.4
    line1 = pyvista.Line([0.4, 0, 0], [0.4, height, 0])
    plotter.add_mesh(line1, color='red', line_width=3, label='Anode-Membrane')
    
    # Membrane-Cathode boundary at x=0.6
    line2 = pyvista.Line([0.6, 0, 0], [0.6, height, 0])
    plotter.add_mesh(line2, color='blue', line_width=3, label='Membrane-Cathode')
    
    plotter.add_title(title, font_size=14)
    plotter.add_legend()
    
    plotter.camera_position = [
        (0.5, 0.5, 2.5),
        (0.5, 0.5, 0.0),
        (0.0, 1.0, 0.0)
    ]
    
    # Ensure assets folder exists
    os.makedirs("assets", exist_ok=True)
    plotter.export_html(f"assets/{image_path}.html")
    
    # Show plot (will skip in headless mode)
    try:
        plotter.show()
    except Exception:
        pass

# ------------------------------
# Simulation parameters & constants
# ------------------------------
petsc_options = {
    "ksp_type": "gmres",
    "pc_type": "ilu",
    "ksp_rtol": 1e-8,
    "ksp_atol": 1e-10,
    "ksp_max_it": 1000
}
# New PETSc options for the Darcy solve (uses Direct LU solver)
darcy_petsc_options = {
    "ksp_type": "preonly",         # Use only the preconditioner (i.e., direct solve)
    "pc_type": "lu",               # LU factorization (Direct Solver)
    "pc_factor_mat_solver_type": "mumps" # Use mumps or superlu_dist for the factorization
}

# Region-specific constants for species transport
region_constants = {
    "anode":    {"Pe": 100.0,    "gamma": 1.0, "Ri": 0.0},
    "membrane": {"Pe": 100.0, "gamma": 1.0,    "Ri": 0.0},
    "cathode":  {"Pe": 100.0,    "gamma": 1.0, "Ri": 0.0},
}

# Global species parameters
z_i_c = 1.0   # valence of Na+ ion
Pe_max = 100.0 # Using Pe as Pe_max for migration in the stabilization term (from user's equation)

# Darcy parameters (for membrane region)
Re_val = 100.0  # Reynolds number
Da_val = 1e-5   # Darcy number

# Temporal parameters
T = 30.0          # Total simulation time [s]
num_steps = 5   # Number of timesteps
dt = T / float(num_steps)

comm = MPI.COMM_WORLD



# ------------------------------
# Build a non-uniform structured mesh
# ------------------------------
def create_layered_structured_mesh(comm, ny=40, n_anode=20, n_mem=120, n_cathode=20):
    """
    Create a structured mesh with variable resolution:
    - Anode (0 to 0.4): coarse (n_anode elements)
    - Membrane (0.4 to 0.6): fine (n_mem elements)
    - Cathode (0.6 to 1.0): coarse (n_cathode elements)
    """
    # ... (code to build x_coords, y_coords, points, and cells remains the same) ...
    x_anode = np.linspace(0.0, 0.4, n_anode + 1, endpoint=True)
    x_mem = np.linspace(0.4, 0.6, n_mem + 1, endpoint=True)[1:]
    x_cath = np.linspace(0.6, 1.0, n_cathode + 1, endpoint=True)[1:]
    x_coords = np.concatenate([x_anode, x_mem, x_cath])
    y_coords = np.linspace(0.0, 1.0, ny + 1, endpoint=True)

    # Create grid points
    points = []
    for y in y_coords:
        for x in x_coords:
            points.append([x, y, 0.0])
    points = np.array(points, dtype=np.float64)

    # Connectivity: build quadrilaterals split into two triangles
    nx = len(x_coords) - 1
    row = len(x_coords)
    cells = []
    for j in range(ny):
        for i in range(nx):
            # node indices
            n0 = j * row + i
            n1 = n0 + 1
            n2 = n0 + row
            n3 = n2 + 1
            # two triangles: (n0, n2, n3) and (n0, n3, n1)
            cells.append([n0, n2, n3])
            cells.append([n0, n3, n1])

    cells = np.array(cells, dtype=np.int64)

    # Define the P1 Lagrange element for the coordinates.
    cell_type = dmesh.CellType.triangle
    coord_element = basix_element("Lagrange", cell_type.name, 1, shape=(3,))
    
    # Create DOLFINx mesh, passing the coordinate element
    domain = dmesh.create_mesh(comm, cells, points, coord_element)
    
    return domain

def top_boundary(x):
    """Locate top boundary (y=1)"""
    return np.isclose(x[1], 1.0)

# Create mesh
print(f"[{datetime.now().isoformat()}] Creating layered mesh...")
mesh_domain = create_layered_structured_mesh(comm, ny=40, n_anode=20, n_mem=120, n_cathode=20)
print(f"  Mesh has {mesh_domain.topology.index_map(2).size_local} cells")

# ------------------------------
# Tag cells into regions by centroid x-coordinate
# ------------------------------
topology = mesh_domain.topology
tdim = mesh_domain.topology.dim
tdim_minus_1 = tdim - 1

# Compute cell centroids
geometry = mesh_domain.geometry.x
cells = mesh_domain.topology.connectivity(tdim, 0).array.reshape((-1, 3))
cell_coords = np.mean(geometry[cells], axis=1)  # shape (n_cells, 3)
cell_x = cell_coords[:, 0]

# Create markers: 1->anode, 2->membrane, 3->cathode
tags = np.zeros(cell_x.shape[0], dtype=np.int32)
tags[cell_x <= 0.4] = 1
tags[(cell_x > 0.4) & (cell_x <= 0.6)] = 2
tags[cell_x > 0.6] = 3

# Create MeshTags for cells
cell_indices = np.arange(len(tags), dtype=np.int32)
mt = meshtags(mesh_domain, tdim, cell_indices, tags)


# ------------------------------
# Tag facets (boundaries) for BCs: Anode Top (1), Membrane Top (2), Cathode Top (3)
# (RE-IMPLEMENTED CORRECT REGION-SPECIFIC TAGGING)
# ------------------------------

# 1. Locate all facets on the top boundary (y=1)
top_facets = locate_entities_boundary(mesh_domain, tdim_minus_1, top_boundary)

# 2. Get the midpoints of these facets to check their x-coordinates
facet_indices = top_facets
all_facet_midpoints = dolfinx.mesh.compute_midpoints(mesh_domain, tdim_minus_1, facet_indices)

# 3. Create arrays for tags
ft_indices = []
ft_values = []

# Loop through top facets and assign tags based on x-coordinate
for i, facet_index in enumerate(facet_indices):
    midpoint_x = all_facet_midpoints[i, 0]
    
    if midpoint_x <= 0.4:
        # Anode Top -> Tag 1 (Outflow)
        ft_indices.append(facet_index)
        ft_values.append(1)
    elif midpoint_x > 0.6:
        # Cathode Top -> Tag 3 (Outflow)
        ft_indices.append(facet_index)
        ft_values.append(3)
    else:
        # Membrane Top -> Tag 2 (No Outflow BC)
        ft_indices.append(facet_index)
        ft_values.append(2)

# Convert to numpy arrays
ft_indices = np.array(ft_indices, dtype=np.int32)
ft_values = np.array(ft_values, dtype=np.int32)

# Sort indices to ensure MeshTags are valid (required by dolfinx)
sort_order = np.argsort(ft_indices)
ft_indices = ft_indices[sort_order]
ft_values = ft_values[sort_order]

# Create the MeshTags object
ft = meshtags(mesh_domain, tdim_minus_1, ft_indices, ft_values)


# Create measures for each region
dx = ufl.Measure("dx", domain=mesh_domain, subdomain_data=mt)
ds = ufl.Measure("ds", domain=mesh_domain, subdomain_data=ft)

print(f"  Anode cells: {np.sum(tags == 1)}")
print(f"  Membrane cells: {np.sum(tags == 2)}")
print(f"  Cathode cells: {np.sum(tags == 3)}")

# ------------------------------
# Function spaces & initial conditions
# ------------------------------
print(f"[{datetime.now().isoformat()}] Creating function spaces...")
V = create_function_space_layered(mesh_domain, degree=3)  # P3 for concentration

# Initial concentration
c_n = set_layered_initial_conditions(V, "Na+")
c_n.x.scatter_forward()

# Trial and test functions for species
Ci = ufl.TrialFunction(V)
w = ufl.TestFunction(V)

# ------------------------------
# Setup Dirichlet boundary conditions
# ------------------------------
print(f"[{datetime.now().isoformat()}] Setting up boundary conditions...")

# Locate bottom boundary (y = 0)
from dolfinx.mesh import locate_entities_boundary

def bottom_boundary(x):
    return np.isclose(x[1], 0.0)

bottom_facets = locate_entities_boundary(mesh_domain, tdim-1, bottom_boundary)

# Get DOFs on bottom boundary
from dolfinx.fem import locate_dofs_topological
bottom_dofs = locate_dofs_topological(V, tdim-1, bottom_facets)

# Separate bottom DOFs by region (anode vs cathode)
# We need to check x-coordinate of each DOF
dof_coords = V.tabulate_dof_coordinates()

# Anode bottom: x <= 0.4, y = 0
anode_bottom_dofs = []
cathode_bottom_dofs = []

for dof in bottom_dofs:
    x_coord = dof_coords[dof, 0]
    if x_coord <= 0.4:
        anode_bottom_dofs.append(dof)
    elif x_coord > 0.6:
        cathode_bottom_dofs.append(dof)
    # Membrane bottom (0.4 < x <= 0.6) has no BC, so skip

anode_bottom_dofs = np.array(anode_bottom_dofs, dtype=np.int32)
cathode_bottom_dofs = np.array(cathode_bottom_dofs, dtype=np.int32)

print(f"  Anode bottom DOFs: {len(anode_bottom_dofs)}")
print(f"  Cathode bottom DOFs: {len(cathode_bottom_dofs)}")


# Create Dirichlet BCs
bc_anode = fem.dirichletbc(ScalarType(0.54), anode_bottom_dofs, V)
bc_cathode = fem.dirichletbc(ScalarType(1.0), cathode_bottom_dofs, V)
bcs = [bc_anode, bc_cathode]



# ----------------------------------------------------
# Membrane interface Dirichlet BCs (CRITICAL FIX)
# ----------------------------------------------------

def membrane_anode_interface(x):
    # x = 0.4, inside membrane height
    return np.isclose(x[0], 0.4)

def membrane_cathode_interface(x):
    # x = 0.6, inside membrane height
    return np.isclose(x[0], 0.6)

# Locate facets on membrane vertical interfaces
membrane_anode_facets = locate_entities_boundary(
    mesh_domain, tdim - 1, membrane_anode_interface
)

membrane_cathode_facets = locate_entities_boundary(
    mesh_domain, tdim - 1, membrane_cathode_interface
)

# Locate DOFs on those facets
membrane_anode_dofs = fem.locate_dofs_topological(
    V, tdim - 1, membrane_anode_facets
)

membrane_cathode_dofs = fem.locate_dofs_topological(
    V, tdim - 1, membrane_cathode_facets
)

# Apply concentration Dirichlet BCs (reservoir states)
bc_membrane_anode = fem.dirichletbc(
    ScalarType(0.54), membrane_anode_dofs, V
)

bc_membrane_cathode = fem.dirichletbc(
    ScalarType(1.0), membrane_cathode_dofs, V
)

# Add to existing BC list
bcs += [bc_membrane_anode, bc_membrane_cathode]

print("  Applied membrane interface concentration BCs:")
print("    x = 0.4 → C = 0.54 (Anode side)")
print("    x = 0.6 → C = 1.00 (Cathode side)")


# ------------------------------
# Setup potential field (Phi = 0 for now)
# ------------------------------
V_phi = create_function_space_layered(mesh_domain, degree=1)
Phi = fem.Function(V_phi)
Phi.x.array[:] = 0.0
Phi.x.scatter_forward()

# ------------------------------
# Build species weak form region-wise
# ------------------------------
print(f"[{datetime.now().isoformat()}] Building species weak form...")

x = ufl.SpatialCoordinate(mesh_domain)
dt_const = fem.Constant(mesh_domain, ScalarType(dt))
# Define advection vector once (u=[0, (1-x)^2])
u_adv_vector = ufl.as_vector((0.0, (1.0 - x[0])**2, 0.0)) 

def build_region_form(region_id, Ci_trial, Cn_func, w_test):
    """Build weak form for a specific region"""
    region_name = {1: "anode", 2: "membrane", 3: "cathode"}[region_id]
    rc = region_constants[region_name]
    Pe_val = float(rc["Pe"])
    gamma_val = float(rc["gamma"])
    Ri_val = float(rc["Ri"])
    
    # Time and Source terms (ALWAYS INCLUDED)
    a_time = (Ci_trial / dt_const) * w_test * dx(region_id)
    L_time = (Cn_func / dt_const) * w_test * dx(region_id)
    L_source = Ri_val * w_test * dx(region_id)
    
    # ----------------------------------------------------
    # Transport Terms (Diffusion, Migration, Advection)
    # ----------------------------------------------------
    
    # Diffusion term
    a_diff = (1.0 / Pe_val) * (
        gamma_val**2 * ufl.grad(Ci_trial)[0] * ufl.grad(w_test)[0] +
        ufl.grad(Ci_trial)[1] * ufl.grad(w_test)[1]
    ) * dx(region_id)
    
    if region_id != 2: # Anode (1) and Cathode (3) - Full transport
        
        # Migration coefficients - Using Pe_max for migration flux term (user specified)
        coeff_mig = z_i_c / Pe_max
        gradPhi = ufl.grad(Phi)
        HessianPhi = ufl.grad(ufl.grad(Phi)) 
        d2Phi_dx2 = HessianPhi[0, 0] 
        d2Phi_dy2 = HessianPhi[1, 1]
        
        # Migration terms (using user's linearization)
        a_mig_b = - coeff_mig * (
            gamma_val**2 * ufl.grad(Ci_trial)[0] * gradPhi[0] +
            ufl.grad(Ci_trial)[1] * gradPhi[1]
        ) * w_test * dx(region_id)
        
        a_mig_c = - coeff_mig * Ci_trial * (
            gamma_val**2 * d2Phi_dx2 + d2Phi_dy2
        ) * w_test * dx(region_id)
        
        # Advection term
        a_adv = ufl.dot(u_adv_vector, ufl.grad(Ci_trial)) * w_test * dx(region_id)
        
        # Total Transport Term
        a_transport = a_diff + a_mig_b + a_mig_c + a_adv
        
        # ----------------------------------------------------
        # SUPG Stabilization Term (New: using user's coth formula)
        # ----------------------------------------------------
        
        # Cell size (h)
        h = ufl.CellDiameter(mesh_domain)
        
        # Magnitude of Advection Velocity |a|. Added 1e-12 for numerical stability 
        # to prevent division by zero when U=0 (at x=1.0, cathode top).
        U = ufl.sqrt(ufl.dot(u_adv_vector, u_adv_vector) + 1e-12)
        
        # Effective Diffusivity Deff (non-dimensional)
        D_eff = 1e-12
        
        # Cell Peclet Number: Pe_cell = |a| * h / (2 * D_eff)
        Pe_cell = U * h / (2.0 * D_eff)
        
        # tau_SUPG = (h / (2*|a|)) * (coth(Pe_cell) - 1/Pe_cell)
        # coth(x) = cosh(x) / sinh(x)
        coth_Pe_cell = ufl.cosh(Pe_cell) / ufl.sinh(Pe_cell)
        tau = (h / (2.0 * U)) * (coth_Pe_cell - 1.0 / Pe_cell)
        
        # SUPG Test Function Component: tau * (a . grad(w))
        grad_w_dot_u = ufl.dot(u_adv_vector, ufl.grad(w_test))
        w_stab = tau * grad_w_dot_u 

        # The stabilization form F_stab = integral( Residual * w_stab ) dV
        
        # Residual LHS operator on Ci (Approximated: Time + Advection)
        # We simplify the residual to focus on the time and advection terms 
        # for robust stabilization, consistent with the standard SUPG theory.
        a_res_operator = (Ci_trial / dt_const) + ufl.dot(u_adv_vector, ufl.grad(Ci_trial))
        a_stab = a_res_operator * w_stab * dx(region_id)

        # Residual RHS terms (Known terms Cn, Ri, etc.)
        L_res_operator = (Cn_func / dt_const) + ufl.dot(u_adv_vector, ufl.grad(Cn_func)) - Ri_val
        L_stab = L_res_operator * w_stab * dx(region_id)
        
        a_reg = a_time + a_transport + a_stab
        L_reg = L_time + L_source + L_stab
        
    else: # Membrane (Region 2) - Diffusion ONLY (Requested Change)
        # Migration and Advection are set to zero
        a_transport = a_diff # Changed from 0 to a_diff
        
        a_reg = a_time + a_transport
        L_reg = L_time + L_source

    # a_reg = a_time + a_transport
    # L_reg = L_time + L_source
    
    return a_reg, L_reg

# Build total weak form by summing over regions
a_total = None
L_total = None

for rid in [1,2, 3]:
    a_reg, L_reg = build_region_form(rid, Ci, c_n, w)
    if a_total is None:
        a_total = a_reg
        L_total = L_reg
    else:
        a_total += a_reg
        L_total += L_reg

# 2. Add the boundary integral (Outflow BC) ONCE after the loop
# The outflow term is: a_outflow = integral( (u_adv . n) * Ci * w dS )
n = ufl.FacetNormal(mesh_domain)
# u_adv_vector = ufl.as_vector((0.0, (1.0 - x[0])**2, 0.0))
# u_dot_n_outflow = ufl.dot(u_adv_vector, n) 

# # Apply outflow ONLY to Anode Top (Tag 1) and Cathode Top (Tag 3) (Fixed)
# # a_outflow = u_dot_n_outflow * Ci * w * (ds(1) + ds(3)) 

# # # Add outflow term to the total LHS form
# # a_total += a_outflow

h_boundary = ufl.FacetArea(mesh_domain)  # Characteristic boundary size
alpha_outflow = fem.Constant(mesh_domain, ScalarType(0.01))  # Small penalty

# Penalty for deviation from pure advection
a_outflow_penalty = alpha_outflow * h_boundary * (
    ufl.dot(ufl.grad(Ci), n) * ufl.dot(ufl.grad(w), n)
) * (ds(1) + ds(3))

a_total += a_outflow_penalty


print(f"  Added Convective Outflow BC term to the top boundaries: Anode (ds(1)) and Cathode (ds(3)).")

# Convert to UFL forms
a = fem.form(a_total)
L = fem.form(L_total)

# ------------------------------
# Setup Darcy problem in membrane (for visualization only)
# ------------------------------
print(f"[{datetime.now().isoformat()}] Setting up Darcy problem in membrane...")

# Create mixed function space for Darcy (u: velocity, p: pressure)
P2_vec = basix_element("Lagrange", mesh_domain.topology.cell_name(), 2, shape=(mesh_domain.geometry.dim,))
P1 = basix_element("Lagrange", mesh_domain.topology.cell_name(), 1)
ME = mixed_element([P2_vec, P1])
W = fem.functionspace(mesh_domain, ME)

print(f"  Mixed space DOFs: {W.dofmap.index_map.size_global}")

# Initialize the solution function for the Darcy problem (u, p)
sol_darcy = fem.Function(W)

# --- Setup Gauge Pressure BC (Essential for Darcy well-posedness) ---
# 1. Get the pressure subspace V_p (index 1 in the mixed space W) and its collapsed form
V_p_subspace = W.sub(1)

# Handle potential tuple return (Space, Map) from collapse()
V_p_collapsed_raw = V_p_subspace.collapse()
if isinstance(V_p_collapsed_raw, tuple):
    V_p_collapsed = V_p_collapsed_raw[0]
else:
    V_p_collapsed = V_p_collapsed_raw

# 2. Define a function to locate DOFs on the bottom boundary (y=0) within the membrane (0.4 < x < 0.6)
def membrane_p_point(x):
    # Check within the membrane region and on the bottom boundary (y=0)
    return (x[0] > 0.4) & (x[0] < 0.6) & np.isclose(x[1], 0.0)

# 3. Manually locate the DOFs using coordinates in the collapsed space
dof_coords_collapsed = V_p_collapsed.tabulate_dof_coordinates() 
dof_mask = membrane_p_point(dof_coords_collapsed.T)
dofs_collapsed = np.where(dof_mask)[0].astype(np.int32)

# 4. Map the located DOFs back to the SubSpace W.sub(1)
# FIXED: Use array indexing, which replaces the removed 'remap_dof_layout_from_collapsed' method.
# This maps the local indices in the collapsed space back to the global indices of the subspace in W.
dofs_p = np.array(V_p_subspace.dofmap.list[dofs_collapsed], dtype=np.int32)

# 5. Create the BC (p=0) using the first found DOF to fix the gauge pressure
if dofs_p.size > 0:
    # Only need one DOF to fix the pressure constant
    bc_p = fem.dirichletbc(ScalarType(0.0), dofs_p[0], V_p_subspace)
    bcs_darcy = [bc_p]
    print(f"  Applied Darcy BC: Fixed pressure at a single point on membrane bottom.")
else:
    bcs_darcy = []
    print("  Warning: Could not locate pressure DOF for gauge fixing.")

# Trial and test functions
(u_trial, p_trial) = ufl.TrialFunctions(W)
(v_test, q_test) = ufl.TestFunctions(W)

# Darcy weak form (integrated only over membrane region 2)
a_darcy = (
    (1.0 / Re_val) * ufl.inner(ufl.grad(u_trial), ufl.grad(v_test)) * dx(2) +
    (1.0 / (Re_val * Da_val)) * ufl.inner(u_trial, v_test) * dx(2) -
    ufl.div(v_test) * p_trial * dx(2) -
    ufl.div(u_trial) * q_test * dx(2)
)

# FIXED: Corrected constant to 3 components (0.0, 0.0, 0.0)
L_darcy = ufl.inner(fem.Constant(mesh_domain, ScalarType((0.0, 0.0, 0.0))), v_test) * dx(2)

a_darcy_form = fem.form(a_darcy)
L_darcy_form = fem.form(L_darcy)

# ------------------------------
# Time-stepping loop
# ------------------------------
print(f"[{datetime.now().isoformat()}] Starting time-stepping loop...")
print(f"  Total time: {T}s, Steps: {num_steps}, dt: {dt}s")

c = fem.Function(V)
c.x.array[:] = c_n.x.array
c.x.scatter_forward()

# Visualize initial condition
try:
    visualize_layered_solution("conc_t00", mesh_domain, c_n, title=f"Na+ concentration t=0.000s")
    print(f"  Exported initial visualization: assets/conc_t00.html")
except Exception as e:
    print(f"  Warning: Initial visualization failed - {e}")

start_time = time.time()

for n in range(1, num_steps + 1):
    t_curr = n * dt
    print(f"\n[{datetime.now().isoformat()}] Time step {n}/{num_steps}: t = {t_curr:.4f}s")
    
    # Solve species transport equation
    # FIXED: Explicitly pass solution function 'c'
    problem_species = LinearProblem(a, L, bcs=bcs, petsc_options=petsc_options, u=c)
    problem_species.solve()
    c.x.scatter_forward()
    
    # Compute min/max concentration
    c_min = np.min(c.x.array)
    c_max = np.max(c.x.array)
    print(f"  Concentration: min={c_min:.6f}, max={c_max:.6f}")
    
    # Solve Darcy in membrane (for visualization/logging only)
    try:
        # Pass sol_darcy, bcs_darcy, AND darcy_petsc_options
        problem_darcy = LinearProblem(a_darcy_form, L_darcy_form, bcs=bcs_darcy, petsc_options=darcy_petsc_options, u=sol_darcy) 
        
        # Solve in-place (no assignment needed)
        problem_darcy.solve()
        
        # Extract velocity magnitude for logging using the robust split/collapse method
        
        # 1. Get the velocity subspace function (sol_darcy.sub(0))
        # 2. Collapse it to get a Function object (u_darcy_func) that lives only in V_vel
        u_darcy_func = sol_darcy.sub(0).collapse()
        
        # u_darcy_func.x.array now contains only the velocity DOFs, structured as (N_vel, 3)
        # Reshape to (N_dofs_per_component, 3) and take the (x, y) components for magnitude
        velocity_array = u_darcy_func.x.array.reshape(-1, mesh_domain.geometry.dim)
        
        # Calculate magnitude (assuming 2D solution in x, y)
        u_mag = np.sqrt(np.sum(velocity_array[:, :2]**2, axis=1))
        
        print(f"  Darcy velocity (membrane): max magnitude={np.max(u_mag):.6e}")
        
    except Exception as e:
        print(f"  Warning: Darcy solve skipped - {e}")
    
    # Visualize concentration
    image_name = f"conc_t{n:02d}"
    try:
        visualize_layered_solution(image_name, mesh_domain, c, title=f"Na+ concentration t={t_curr:.3f}s")
        print(f"  Exported visualization: assets/{image_name}.html")
    except Exception as e:
        print(f"  Warning: Visualization failed - {e}")
    
    # Update time level
    c_n.x.array[:] = c.x.array
    c_n.x.scatter_forward()

end_time = time.time()
print(f"\n[{datetime.now().isoformat()}] Simulation completed!")
print(f"  Wall-clock time: {end_time - start_time:.2f}s")
print(f"  All visualizations saved to assets/ directory")