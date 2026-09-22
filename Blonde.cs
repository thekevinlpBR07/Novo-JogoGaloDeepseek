// Clareia o cabelo da folha A (castanho-mel) para o loiro da folha B: so pixels de cabelo (matiz 33-41, saturados) na parte de cima do quadro.
using System;using System.Drawing;using System.Drawing.Imaging;
public static class Blonde{
 static void ToHsv(Color c,out double h,out double s,out double v){double r=c.R/255.0,g=c.G/255.0,b=c.B/255.0,mx=Math.Max(r,Math.Max(g,b)),mn=Math.Min(r,Math.Min(g,b)),d=mx-mn;h=0;if(d>0){if(mx==r)h=60*(((g-b)/d)%6);else if(mx==g)h=60*((b-r)/d+2);else h=60*((r-g)/d+4);}if(h<0)h+=360;s=mx==0?0:d/mx;v=mx;}
 static Color FromHsv(double h,double s,double v,int a){double c=v*s,x=c*(1-Math.Abs((h/60)%2-1)),m=v-c,r=0,g=0,b=0;if(h<60){r=c;g=x;}else if(h<120){r=x;g=c;}else if(h<180){g=c;b=x;}else if(h<240){g=x;b=c;}else if(h<300){r=x;b=c;}else{r=c;b=x;}
  return Color.FromArgb(a,(int)Math.Round((r+m)*255),(int)Math.Round((g+m)*255),(int)Math.Round((b+m)*255));}
 public static void Run(string src,string dst,double headFrac,double hMin,double hMax,double sMin){
  var bm=new Bitmap(src);int H=bm.Height,W=bm.Width;int lim=(int)(H*headFrac);
  // no primeiro passo acha o topo do personagem (primeira linha com pixel opaco)
  for(int y=0;y<lim;y++)for(int x=0;x<W;x++){var c=bm.GetPixel(x,y);if(c.A==0)continue;double h,s,v;ToHsv(c,out h,out s,out v);
   if(h>=hMin&&h<=hMax&&s>=sMin&&v>0.30&&v<0.97){bm.SetPixel(x,y,FromHsv(Math.Min(50,h+11),s*0.55,Math.Min(1,v*1.16+0.06),c.A));}}
  bm.Save(dst);}}
