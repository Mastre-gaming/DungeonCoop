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
def coller(img,W,H,n,sx,sy,w,h,dx,dy,miroir=False):
    _,_,px=feuille(n)
    for y in range(int(h*T)):
        for x in range(int(w*T)):
            p=px[int(sy*T)+y][int(sx*T)+(int(w*T)-1-x if miroir else x)]   # miroir : retournée de gauche à droite
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
# Les dalles (proposition du 18 oct, l'armurerie) : aucune planche LPC n'en a dans les tons du camp, alors on les dessine,
# case par case : 4 pierres irrégulières par case, joint sombre, lumière en haut à gauche (style LPC). (i, j) en cases.
DALLE=[(0x34,0x2a,0x28),(0x5e,0x54,0x4c),(0x78,0x6c,0x60),(0x90,0x84,0x74),(0xa6,0x99,0x86)]   # joint, ombre, pierre, clair, lumière
def dalles(img,W,H,cases,ox,oy):
    import random
    for (i,j) in cases:
        rnd=random.Random(i*7919+j*104729)
        x0,y0=int((ox+i)*T),int((oy+j)*T)
        cx=x0+16+rnd.randint(-4,4); cy=y0+16+rnd.randint(-4,4)
        for (a,b,c,d) in ((x0,y0,cx,cy),(cx,y0,x0+32,cy),(x0,cy,cx,y0+32),(cx,cy,x0+32,y0+32)):
            teinte=rnd.choice((0,0,0,1,-1))
            for y in range(b,d):
                for x in range(a,c):
                    if not(0<=x<W and 0<=y<H): continue
                    bord=x==a or y==b
                    coin=(x-a<2 and y-b<2) or (c-1-x<2 and d-1-y<2) or (x-a<2 and d-1-y<2) or (c-1-x<2 and y-b<2)
                    if coin and (x-a+y-b)%3==0: continue          # coins arrondis : l'herbe ou la terre passe
                    if bord: col=DALLE[0]
                    elif x==a+1 or y==b+1: col=DALLE[3+(teinte>0)]
                    elif x==c-1 or y==d-1: col=DALLE[1]
                    else: col=DALLE[max(1,min(3,2+teinte))] if (x*13+y*7)%11 else DALLE[1]
                    img[y][x]=col+(255,)
def niveau(spec,cols=8,rows=7):
    W,H=cols*T,rows*T; img=[[(0,0,0,255)]*W for _ in range(H)]
    # emprise 6x5 au centre, porte en bas au centre ; chemin de terre devant la porte
    ox,oy=1,1
    sol(img,W,H,cols,rows,{(3,6),(4,6),(3,5),(4,5)} | set(tuple(c) for c in spec.get('terre',[])))
    dalles(img,W,H,[tuple(c) for c in spec.get('dalles',[])],ox,oy)
    for p in spec['pieces']:
        if p[0]=='rect':   # ["rect", "#rrggbb", w, h, dx, dy] : un aplat (l'intérieur sombre d'une ouverture)
            _,c,w,h,dx,dy=p; col=tuple(int(c[k:k+2],16) for k in (1,3,5))+(255,)
            for y in range(int((oy+dy)*T),int((oy+dy+h)*T)):
                for x in range(int((ox+dx)*T),int((ox+dx+w)*T)):
                    if 0<=x<W and 0<=y<H: img[y][x]=col
        else:
            n,sx,sy,w,h,dx,dy=p[:7]; coller(img,W,H,n,sx,sy,w,h,ox+dx,oy+dy,len(p)>7 and p[7]=='miroir')
    # cadre pointillé de l'emprise
    for x in range(ox*T,(ox+6)*T):
        for y in (oy*T,(oy+5)*T-1):
            if (x//4)%2: img[y][x]=(255,255,255,255)
    for y in range(oy*T,(oy+5)*T):
        for x in (ox*T,(ox+6)*T-1):
            if (y//4)%2: img[y][x]=(255,255,255,255)
    return W,H,img
def planche(specs,z,sortie,marge=8,cols=8):
    rendus=[niveau(s,cols) for s in specs]
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
