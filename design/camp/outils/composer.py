# Compose les 5 niveaux d'un lieu sur une emprise de 6 x 5 cases (32 px), à partir de vraies pièces LPC.
import sys, json
from png import lire, ecrire
from sources import planche as planche_brute, piece
T=32
cache={}
def feuille(n):
    if n not in cache:
        if n=='grass_clair':  # retouche : l'herbe LPC, plus claire et plus chaude (camp lumineux)
            w,h,px=planche_brute("grass")
            cache[n]=(w,h,[[(min(255,int(r*1.05+10)),min(255,int(g*1.07+10)),int(b*0.95),a) for (r,g,b,a) in row] for row in px])
        else: cache[n]=planche_brute(n)
    return cache[n]
def coller(img,W,H,n,sx,sy,w,h,dx,dy):
    _,_,px=feuille(n)
    for y in range(int(h*T)):
        for x in range(int(w*T)):
            p=px[int(sy*T)+y][int(sx*T)+x]
            if p[3]==0: continue
            X,Y=int(dx*T)+x,int(dy*T)+y
            if 0<=X<W and 0<=Y<H:
                a=p[3]/255; q=img[Y][X]
                img[Y][X]=tuple(int(p[k]*a+q[k]*(1-a)) for k in range(3))+(255,)
def sol(img,W,H,cols,rows,chemin):
    bords={(3,5):(0,2),(4,5):(2,2),(3,6):(0,3),(4,6):(2,3)}
    for j in range(rows):
        for i in range(cols):
            coller(img,W,H,'grass_clair',1,3,1,1,i,j)
            if (i*7+j*3)%11==0: coller(img,W,H,'grass_clair',(i+j)%3,5,1,1,i,j)
            if (i,j) in bords: coller(img,W,H,'dirt',*bords[(i,j)],1,1,i,j)
def niveau(spec,cols=8,rows=7):
    W,H=cols*T,rows*T; img=[[(0,0,0,255)]*W for _ in range(H)]
    # emprise 6x5 au centre, porte en bas au centre ; chemin de terre devant la porte
    ox,oy=1,1
    sol(img,W,H,cols,rows,{(3,6),(4,6),(3,5),(4,5)} | set(tuple(c) for c in spec.get('terre',[])))
    for (n,sx,sy,w,h,dx,dy) in spec['pieces']: coller(img,W,H,n,sx,sy,w,h,ox+dx,oy+dy)
    # cadre pointillé de l'emprise
    for x in range(ox*T,(ox+6)*T):
        for y in (oy*T,(oy+5)*T-1):
            if (x//4)%2: img[y][x]=(255,255,255,255)
    for y in range(oy*T,(oy+5)*T):
        for x in (ox*T,(ox+6)*T-1):
            if (y//4)%2: img[y][x]=(255,255,255,255)
    return W,H,img
def planche(specs,z,sortie,marge=8):
    rendus=[niveau(s) for s in specs]
    W=sum(r[0]*z+marge for r in rendus)+marge; H=max(r[1] for r in rendus)*z+2*marge
    out=[[(244,243,239,255)]*W for _ in range(H)]; x0=marge
    for (w,h,img) in rendus:
        for y in range(h*z):
            row=img[y//z]
            for x in range(w*z): out[marge+y][x0+x]=row[x//z]
        x0+=w*z+marge
    ecrire(sortie,W,H,out); print(sortie,W,H)
if __name__=='__main__':
    specs=json.load(open(sys.argv[1],encoding='utf-8'))
    planche(specs['niveaux'],int(sys.argv[3]) if len(sys.argv)>3 else 2,sys.argv[2])
