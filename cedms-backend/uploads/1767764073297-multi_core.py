from mpi4py import MPI
import numpy as np
import time

# --------------------------
# 1. Set up MPI
# --------------------------
comm = MPI.COMM_WORLD
rank = comm.rank
size = comm.size

# --------------------------
# 2. Problem and timestep settings
# --------------------------
N = 10_000_000      # total size of array (global)
num_steps = 5       # number of timesteps
dt = 0.1            # timestep size

# --------------------------
# 3. Distribute the array across ranks
# --------------------------
# Simple partition: first 'remainder' ranks get one extra element
base_local_n = N // size
remainder = N % size

if rank < remainder:
    local_n = base_local_n + 1
else:
    local_n = base_local_n

# Each rank stores only its local part
local_u = np.ones(local_n, dtype=float)

# --------------------------
# 4. Time-stepping loop
# --------------------------
start_time = MPI.Wtime()   # MPI wall-clock time (works in parallel)

for step in range(num_steps):
    t = (step + 1) * dt

    # Local update: same operation on each rank's local chunk
    local_u += dt

    # Local sum on each rank
    local_sum = np.sum(local_u)

    # Global sum across all ranks
    global_sum = comm.allreduce(local_sum, op=MPI.SUM)

    # Only rank 0 prints the global info
    if rank == 0:
        print(f"[parallel] step = {step+1}, t = {t:.2f}, global_total = {global_sum:.2f}")

end_time = MPI.Wtime()
elapsed = end_time - start_time

# --------------------------
# 5. Timing info
# --------------------------
# Get max time across ranks to see worst-case runtime
max_elapsed = comm.reduce(elapsed, op=MPI.MAX, root=0)

if rank == 0:
    print(f"[parallel] Max time across ranks: {max_elapsed:.3f} seconds (size = {size})")
