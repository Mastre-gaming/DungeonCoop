# Le panneau-carte du camp, dessiné pixel par pixel dans le style LPC (contour sombre, lumière en haut à gauche,
# rampe de bois prise sur les planches LPC). La carte montre le plan C ; chaque zone prend sa couleur et sa taille
# selon son niveau. Sortie : un PNG de 96 x 80 px (3 cases x 2,5).
import sys, json
from png import ecrire
H=lambda s:tuple(int(s[i:i+2],16) for i in (1,3,5))+(255,)
CONT=H('#2b1c1d'); BF=H('#3e2613'); BD=H('#573726'); BM=H('#85581b'); BB=H('#986a20'); BL=H('#b78c41'); BH=H('#ccbd7b')
PAR=H('#ead6a2'); PARO=H('#d4b77c'); PARF=H('#b8945a')
FORET=H('#2e5d3a'); FORETC=H('#3f7a46'); COTE=H('#1f3d33'); SABLE=H('#e2c48c'); CHEMIN=H('#c9a565')
PIERRE=H('#8f8a7c'); FEU=H('#e8792a'); FEUC=H('#ffd35a'); ENCRE=H('#2a2333'); PIN=H('#c2412f')
W,Hh=96,80
def nouveau(): return [[(0,0,0,0)]*W for _ in range(Hh)]
def pt(g,x,y,c):
    if 0<=x<W and 0<=y<Hh: g[y][x]=c
def rect(g,x0,y0,x1,y1,c):
    for y in range(y0,y1+1):
        for x in range(x0,x1+1): pt(g,x,y,c)
def poteau(g,x0):
    # poteau de 8 px : contour, ombre à droite, lumière à gauche, chapeau arrondi au-dessus de la traverse
    rect(g,x0,3,x0+7,79,CONT)
    rect(g,x0+1,4,x0+6,79,BB)
    for y in range(4,80): pt(g,x0+1,y,BL); pt(g,x0+2,y,BL if y%9 else BB); pt(g,x0+5,y,BD); pt(g,x0+6,y,BF)
    pt(g,x0,3,(0,0,0,0)); pt(g,x0+7,3,(0,0,0,0)); pt(g,x0+1,4,BH); pt(g,x0+2,4,BH)
    for y in (24,47,63): pt(g,x0+3,y,BD); pt(g,x0+4,y+1,BD)   # nœuds du bois
def traverse(g):
    rect(g,4,9,91,17,CONT)
    rect(g,3,10,92,16,CONT)
    rect(g,4,10,91,15,BB)
    for x in range(4,92): pt(g,x,10,BH if x<60 else BL); pt(g,x,11,BL); pt(g,x,15,BD); pt(g,x,14,BM if x%7 else BD)
    for x in (20,21,22,48,49,70,71,72,73): pt(g,x,12,BM)       # veines
    rect(g,3,16,92,16,CONT)
def cadre_parchemin(g):
    rect(g,17,19,78,58,CONT)
    rect(g,18,20,77,57,BM); rect(g,18,20,77,20,BL); rect(g,18,57,77,57,BD)
    rect(g,20,22,75,55,CONT)
    rect(g,21,23,74,54,PAR)
    for x in range(21,75): pt(g,x,54,PARO)
    for y in range(23,55): pt(g,74,y,PARO)
    for (x,y) in [(21,23),(22,23),(21,24),(74,54),(73,54),(74,53)]: pt(g,x,y,PARF)
def carte(g,niveaux,zones,couleurs):
    # la carte : x 23..61, y 25..52 (39 x 28 px) pour un camp de 42 x 28 cases
    X0,Y0,MW,MH=23,25,39,28; sx=MW/42; sy=MH/28
    for y in range(Y0,Y0+MH):
        for x in range(X0,X0+MW):
            dx=min(x-X0,X0+MW-1-x); dy=min(y-Y0,Y0+MH-1-y)
            if dx+dy<2: continue
            pt(g,x,y,COTE if (dx==0 or dy==0 or dx+dy==2) else FORET)
    # les clairières (sable) du plan C
    for (cx,cy,r) in [(20.5,14.5,4.4),(9.5,6.5,4.6),(31.5,5.5,4.6),(29.5,21.5,4.4),(9.5,22.5,3.6)]:
        for y in range(Y0+1,Y0+MH-1):
            for x in range(X0+1,X0+MW-1):
                if ((x+.5-X0)/sx-cx)**2+((y+.5-Y0)/sy-cy)**2 <= r*r: pt(g,x,y,SABLE)
    # quelques arbres plus clairs dans la forêt
    for (x,y) in [(25,27),(30,26),(44,26),(52,27),(58,30),(26,39),(57,40),(40,48),(33,50),(48,50)]:
        if g[y][x]==FORET: pt(g,x,y,FORETC)
    # les sentiers (une ligne de 1 px) du feu vers chaque clairière
    def ligne(a,b):
        (x0,y0),(x1,y1)=a,b; n=int(max(abs(x1-x0),abs(y1-y0))*2)+1
        for k in range(n+1):
            x=round(X0+(x0+(x1-x0)*k/n)*sx); y=round(Y0+(y0+(y1-y0)*k/n)*sy)
            if g[y][x] in (FORET,FORETC,SABLE): pt(g,x,y,CHEMIN)
    for b in [(9.5,6.5),(31.5,5.5),(29.5,21.5),(9.5,22.5),(14.5,27)]: ligne((20,14),b)
    # les zones : un bloc qui grandit avec le niveau (gris tant qu'elle est au niveau 0)
    taille=[(2,1),(2,2),(3,2),(3,3),(4,3)]
    for zid,(px_,py_) in zones.items():
        n=niveaux.get(zid,0); w,h=taille[n]
        cx=round(X0+(px_+1)*sx); cy=round(Y0+(py_-1.5)*sy)
        x0=cx-w//2; y0=cy-h//2
        coul=PIERRE if n==0 else H(couleurs[zid])
        rect(g,x0-1,y0-1,x0+w,y0+h,ENCRE)
        rect(g,x0,y0,x0+w-1,y0+h-1,coul)
        if n>=3: pt(g,x0,y0,(255,245,210,255))
    # le feu au centre, et l'épingle « vous êtes ici » près du tableau
    fx,fy=round(X0+20*sx),round(Y0+14*sy)
    rect(g,fx-1,fy-1,fx+1,fy+1,ENCRE); pt(g,fx,fy,FEUC); pt(g,fx-1,fy,FEU); pt(g,fx+1,fy,FEU); pt(g,fx,fy-1,FEU); pt(g,fx,fy+1,FEU)
def legende(g,niveaux,couleurs,ordre):
    # à droite de la carte : une pastille par zone et un trait, comme une légende (illisible de près, lisible en couleurs)
    y=26
    for zid in ordre:
        n=niveaux.get(zid,0); c=PIERRE if n==0 else H(couleurs[zid])
        rect(g,64,y,66,y+2,ENCRE); pt(g,65,y+1,c)
        rect(g,68,y+1,68+min(5,1+n),y+1,ENCRE)
        y+=3+ (1 if zid!=ordre[-1] else 0)
    rect(g,64,52,72,52,ENCRE)
def dessiner(niveaux,sortie):
    zones=json.load(open('zones_camp.json',encoding='utf-8'))
    couleurs={'interface':'#2f68b8','combat':'#c2412f','classes':'#d9822b','art':'#c25a8a','histoire':'#8e5cc2','level':'#2f7d6d','runs':'#5b6e2f','son':'#7a6a5a'}
    ordre=['interface','combat','classes','art','histoire','level','runs','son']
    g=nouveau(); poteau(g,9); poteau(g,78); traverse(g); cadre_parchemin(g); carte(g,niveaux,zones,couleurs); legende(g,niveaux,couleurs,ordre)
    ecrire(sortie,W,Hh,g)
def fond(sortie):
    # le fond fixe (poteaux, traverse, cadre, carte sans les zones) : le jeu et la démo colorient les zones par-dessus
    g=nouveau(); poteau(g,9); poteau(g,78); traverse(g); cadre_parchemin(g); carte(g,{},{},{})
    ecrire(sortie,W,Hh,g)
def positions(sortie):
    # où dessiner chaque zone sur la carte, pour chaque niveau : [x, y, largeur, hauteur]
    zones=json.load(open('zones_camp.json',encoding='utf-8'))
    X0,Y0,MW,MH=23,25,39,28; sx=MW/42; sy=MH/28
    taille=[(2,1),(2,2),(3,2),(3,3),(4,3)]
    pos={z:[[round(X0+(px+1)*sx)-w//2,round(Y0+(py-1.5)*sy)-h//2,w,h] for (w,h) in taille] for z,(px,py) in zones.items()}
    json.dump(pos,open(sortie,'w'))
if __name__=='__main__':
    # python panneau_carte.py               le fond et les positions des zones, pour le jeu et la démo
    # python panneau_carte.py '{"combat":2}' sortie.png   un panneau complet, pour regarder
    if len(sys.argv)>2: dessiner(json.loads(sys.argv[1]),sys.argv[2])
    else:
        from sources import piece
        fond(piece('carte_fond')); positions('carte_zones.json')
        dessiner({},piece('carte_debut')); dessiner({"interface":2,"art":1,"combat":1,"classes":3,"histoire":4},piece('carte_milieu'))
        print('panneau-carte : fond, positions et deux exemples écrits')
