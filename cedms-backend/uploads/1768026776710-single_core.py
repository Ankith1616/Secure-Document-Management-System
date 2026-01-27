import time
import numpy as np

# Problem size
N = 10_000_000      # length of array (big enough to see some time)
num_steps = 5       # number of timesteps
dt = 0.1            # timestep size

# Initial condition: u(x, 0) = 1 for all x
u = np.ones(N, dtype=float)

start_time = time.time()

for step in range(num_steps):
    t = (step + 1) * dt  # current time

    # Simple "update": u = u + dt
    u += dt

    # Diagnostics (single core, so we can just sum directly)
    total = np.sum(u)
    print(f"[single] step = {step+1}, t = {t:.2f}, total = {total:.2f}")

end_time = time.time()
print(f"[single] Finished in {end_time - start_time:.3f} seconds")
