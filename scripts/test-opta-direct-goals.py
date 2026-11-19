"""Numerical validation of the isolated Opta goal experiment; no artifact writes."""
import sys
sys.dont_write_bytecode = True
import importlib.util, pathlib, math
import numpy as np
file = pathlib.Path(__file__).resolve().parent / 'research/calibrate-opta-goals.py'
spec = importlib.util.spec_from_file_location('opta_direct_goals', file)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
x = m.features(np.array([-15., -10., -5., 0., 5., 10., 15., 0., -8., 8.]))
y = np.array([[0, 4], [1, 3], [1, 2], [2, 1], [2, 1], [3, 0], [4, 0], [1, 1], [1, 3], [3, 1]])
lam = 1.
t = m.fit(x, y, lam)
eps = 1e-5
gradient = np.array([(m.objective(t + np.eye(3)[i] * eps, x, y, lam) - m.objective(t - np.eye(3)[i] * eps, x, y, lam)) / (2 * eps) for i in range(3)])
assert np.max(np.abs(gradient)) < 1e-5
assert m.objective(t, x, y, lam) < m.objective(np.zeros(3), x, y, lam)
assert t[2] > 0
reversed_fit = m.fit(x, y[:, ::-1], lam)
assert reversed_fit[2] == 0, 'Reversed strength must hit nonnegative slope boundary'
assert np.all(m.rates(t, x) > 0)
means = m.rates(np.array([.4, 0., .5]), m.features([-10., 0., 10.]))
p = m.outcomes(means)
assert np.allclose(p.sum(axis=1), 1) and np.all(p > 0)
assert p[0, 0] < p[1, 0] < p[2, 0]
assert np.allclose(p[0], p[2, ::-1]), 'Team swap symmetry without home advantage'
assert np.allclose(means.prod(axis=1), np.exp(.8)), 'Declared constant product constraint'
assert np.allclose(m.score_losses(np.array([[1., 2.]]), np.array([[0, 3]])), [3 - 3 * math.log(2) + math.lgamma(4)])
for rate in [.01, 1., 5., 20., 100.]:
    support, tail = m.poisson_support(rate)
    assert tail <= 1.01e-13
    assert abs(np.dot(np.arange(len(support)), support) - rate) < 1e-9
print('PASS direct-goal optimizer gradient/KKT, lower objective, nonnegative slope, complete Poisson NLL, adaptive tails, analytical means and coherent 1X2 symmetry/monotonicity')
