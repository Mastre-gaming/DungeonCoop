import importlib.util, math, sys
spec=importlib.util.spec_from_file_location('p','plans.py'); p=importlib.util.module_from_spec(spec); spec.loader.exec_module(p)
def emprise(px,py,marge=0): return (px+1-3-marge, py+1-5-marge, px+1+3+marge, py+1+marge)  # x0,y0,x1,y1 (niveau 4)
def inter(a,b): return a[0]<b[2] and b[0]<a[2] and a[1]<b[3] and b[1]<a[3]
def segments(ch):
    for (x0,y0),(x1,y1) in zip(ch,ch[1:]):
        n=int(max(abs(x1-x0),abs(y1-y0))*4)+1
        for k in range(n+1):
            t=k/n; yield (x0+(x1-x0)*t+.5, y0+(y1-y0)*t+.5)
for nom,pl in p.plans.items():
    W,H=pl['taille']; L=pl['lieux']; pb=[]; P=pl.get('emprises',{})   # P : les lieux qui ont leur emprise à eux
    E={n:P.get(n) or emprise(*xy) for n,xy in L.items()}
    for a in L:
        for b in L:
            ea=E[a]
            if a<b and inter((ea[0]-1,ea[1]-1,ea[2]+1,ea[3]+1),E[b]): pb.append(f'{a} et {b} trop proches')
        x0,y0,x1,y1=E[a]
        if x0<1 or y0<1 or x1>W-1 or y1>H-1: pb.append(f'{a} touche le bord')
        fx,fy=pl['feu']
        if inter(E[a],(fx-2.5,fy-2.5,fx+2.5,fy+2.5)): pb.append(f'{a} touche le feu')
        for (tx,ty) in pl['arbres']:
            if inter(E[a],(tx,ty,tx+1,ty+1)): pb.append(f'{a} sur un arbre ({tx},{ty})'); break
    for i,ch in enumerate(pl['chemins']):
        fin=ch[-1]
        for (x,y) in segments(ch):
            for n,e in E.items():
                if abs(L[n][0]+.5-fin[0])<1 and abs(L[n][1]-fin[1])<1: continue
                if e[0]+.3<x<e[2]-.3 and e[1]+.3<y<e[3]-1.3: pb.append(f'chemin {i} traverse {n}'); break
            else: continue
            break
    # caméra 20x11 : combien de lieux (centre de l'emprise) tiennent entièrement dans le cadre, au pire
    pire=0
    for cx in range(0,W-19):
        for cy in range(0,H-10):
            v=(cx,cy,cx+20,cy+11)
            k=sum(1 for e in E.values() if e[0]>=v[0] and e[2]<=v[2] and e[1]>=v[1] and e[3]<=v[3])
            pire=max(pire,k)
    print(f'{nom} {W}x{H} : au plus {pire} lieu(x) entier(s) à l\'écran ; ' + ('OK' if not pb else ' ; '.join(sorted(set(pb)))))
