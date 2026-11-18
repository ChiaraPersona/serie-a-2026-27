"""Numerical checks for the isolated research calibration; no artifact writes."""
import sys,importlib.util,pathlib
sys.dont_write_bytecode=True
import numpy as np
p=pathlib.Path(__file__).resolve().parent/'research/calibrate-opta-1x2.py'
spec=importlib.util.spec_from_file_location('opta_calibration',p);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
x=m.features(np.array([-15.,-10.,-5.,0.,5.,10.,15.,0.,-8.,8.]))
y=np.array([2,2,1,0,0,0,0,1,2,0]);lam=1.
t=m.fit(x,y,lam)
eps=1e-5
gradient=np.array([(m.objective(t+np.eye(3)[i]*eps,x,y,lam)-m.objective(t-np.eye(3)[i]*eps,x,y,lam))/(2*eps) for i in range(3)])
assert np.max(np.abs(gradient))<1e-5,gradient
assert m.objective(t,x,y,lam)<m.objective(np.zeros(3),x,y,lam)
pp=m.prob(t,x);assert np.allclose(pp.sum(axis=1),1) and np.all(pp>0)
# Extreme differences remain numerically finite; no raw score is treated as %.
extreme=m.prob(t,m.features(np.array([-100.,100.])))
assert np.isfinite(extreme).all() and np.allclose(extreme.sum(axis=1),1)
# A perverse synthetic sample must not produce a negative strength slope.
reversed_labels=np.array([0,0,0,0,2,2,2,1,0,2])
rev=m.fit(x,reversed_labels,lam);assert rev[1]>=0
g=np.array([(m.objective(rev+np.eye(3)[i]*eps,x,reversed_labels,lam)-m.objective(rev-np.eye(3)[i]*eps,x,reversed_labels,lam))/(2*eps) for i in range(3)])
assert np.max(np.abs(g[[0,2]]))<1e-5
if rev[1]<1e-8:assert g[1]>=-1e-5
print('PASS: optimum numerico, obiettivo migliorato, probabilita normalizzate, stabilita, vincolo di pendenza.')
