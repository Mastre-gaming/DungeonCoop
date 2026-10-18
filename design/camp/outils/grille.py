# grille.py feuille.png x y w h zoom sortie.png : extrait (en cases de 32 px) agrandi, avec une grille et les numéros.
import sys; from png import lire, ecrire
f,x0,y0,w,h,z,out=sys.argv[1],*map(int,sys.argv[2:7]),sys.argv[7]
T=int(sys.argv[8]) if len(sys.argv)>8 else 32
W,H,px=lire(f); M=0
fond=(106,154,74,255)
ow,oh=w*T*z,h*T*z; img=[[fond]*ow for _ in range(oh)]
for y in range(oh):
    sy=y0*T+y//z
    for x in range(ow):
        sx=x0*T+x//z
        if sy<H and sx<W:
            p=px[sy][sx]; a=p[3]/255
            img[y][x]=(int(p[0]*a+fond[0]*(1-a)),int(p[1]*a+fond[1]*(1-a)),int(p[2]*a+fond[2]*(1-a)),255)
        if (x%(T*z)==0) or (y%(T*z)==0): img[y][x]=(255,255,255,255) if (x//(T*z)+y//(T*z))%2 else (0,0,0,255)
ecrire(out,ow,oh,img); print(out,ow,oh,'feuille',W,H)
