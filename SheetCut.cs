// Recorta uma folha de sprites (fundo magenta) em quadros: detecta componentes conectados,
// agrupa em fileiras conforme a contagem esperada e salva cada quadro recortado (RGBA).
using System;using System.IO;using System.Linq;using System.Collections.Generic;using System.Drawing;using System.Drawing.Imaging;
public static class SheetCut{
 static bool IsBg(Color c){double m=Math.Min(c.R,c.B)-c.G;return m>70&&c.R>140&&c.B>140;}
 public static string Run(string src,string outDir,string[] names,int[] rows,int R=4){
  var bm=new Bitmap(src);int W=bm.Width,H=bm.Height;var fg=new bool[W*H];
  for(int y=0;y<H;y++)for(int x=0;x<W;x++)fg[y*W+x]=!IsBg(bm.GetPixel(x,y));
  // dilatacao 4px so para o rotulamento (junta pedacinhos de um mesmo quadro)
  var d=new bool[W*H];
  for(int y=0;y<H;y++)for(int x=0;x<W;x++)if(fg[y*W+x])for(int dy=-R;dy<=R;dy+=(R>1?2:1))for(int dx=-R;dx<=R;dx+=(R>1?2:1)){int nx=x+dx,ny=y+dy;if(nx>=0&&ny>=0&&nx<W&&ny<H)d[ny*W+nx]=true;}
  var lab=new int[W*H];int n=0;var comps=new List<int[]>();var stack=new Stack<int>();
  for(int i=0;i<W*H;i++){if(!d[i]||lab[i]!=0)continue;n++;int x0=W,y0=H,x1=0,y1=0,cnt=0;stack.Push(i);lab[i]=n;
   while(stack.Count>0){int p=stack.Pop();int px=p%W,py=p/W;cnt++;if(px<x0)x0=px;if(px>x1)x1=px;if(py<y0)y0=py;if(py>y1)y1=py;
    for(int k=0;k<4;k++){int nx=px+(k==0?1:k==1?-1:0),ny=py+(k==2?1:k==3?-1:0);if(nx<0||ny<0||nx>=W||ny>=H)continue;int q=ny*W+nx;if(d[q]&&lab[q]==0){lab[q]=n;stack.Push(q);}}}
   if(cnt>3000)comps.Add(new[]{x0,y0,x1,y1,cnt});}
  // agrupa em fileiras pelo centro vertical
  var order=comps.OrderBy(c=>(c[1]+c[3])/2).ToList();int total=rows.Sum();
  // Dois quadros grudados viram um componente so: divide o mais largo na coluna com menos pixels.
  while(order.Count<total&&order.Count>0){var widths=order.Select(c=>c[2]-c[0]+1).OrderBy(v=>v).ToList();int med=widths[widths.Count/2];
   var wide=order.OrderByDescending(c=>c[2]-c[0]).First();if((wide[2]-wide[0]+1)<med*1.05)break;
   int a=wide[0]+(wide[2]-wide[0])/3,b=wide[0]+2*(wide[2]-wide[0])/3,best=a,bestCnt=int.MaxValue;
   for(int x=a;x<=b;x++){int cnt=0;for(int y=wide[1];y<=wide[3];y++)if(fg[y*W+x])cnt++;if(cnt<bestCnt){bestCnt=cnt;best=x;}}
   Func<int,int,int[]> mk=(xa,xb)=>{int y0=H,y1=0;for(int y=wide[1];y<=wide[3];y++)for(int x=xa;x<=xb;x++)if(fg[y*W+x]){if(y<y0)y0=y;if(y>y1)y1=y;}return new[]{xa,y0,xb,y1,1};};
   order.Remove(wide);order.Add(mk(wide[0],best-1));order.Add(mk(best,wide[2]));order=order.OrderBy(c=>(c[1]+c[3])/2).ToList();}
  // Sobrando componentes (objeto solto perto do personagem, ex.: galinha): funde o MENOR componente com o vizinho mais proximo.
  while(order.Count>total){var s=order.OrderBy(c=>c[4]).First();int bg=int.MaxValue;int[] nb=null;
   foreach(var c in order){if(c==s)continue;int gx=Math.Max(0,Math.Max(s[0],c[0])-Math.Min(s[2],c[2]));int gy=Math.Max(0,Math.Max(s[1],c[1])-Math.Min(s[3],c[3]));int g=gx+gy;if(g<bg){bg=g;nb=c;}}
   if(nb==null||bg>150)break;var u=new[]{Math.Min(s[0],nb[0]),Math.Min(s[1],nb[1]),Math.Max(s[2],nb[2]),Math.Max(s[3],nb[3]),s[4]+nb[4]};
   order.Remove(s);order.Remove(nb);order.Add(u);order=order.OrderBy(c=>(c[1]+c[3])/2).ToList();}  if(order.Count!=total)return "ERRO: "+order.Count+" componentes, esperado "+total;
  var res="";int idx=0,ni=0;
  Directory.CreateDirectory(outDir);
  foreach(var rc in rows){var row=order.Skip(idx).Take(rc).OrderBy(c=>c[0]).ToList();idx+=rc;
   foreach(var c in row){int w=c[2]-c[0]+1,h=c[3]-c[1]+1;var o=new Bitmap(w,h,PixelFormat.Format32bppArgb);int ax0=w,ax1=0,ay0=h,ay1=0;
    for(int y=0;y<h;y++)for(int x=0;x<w;x++){var px=bm.GetPixel(c[0]+x,c[1]+y);if(IsBg(px)){o.SetPixel(x,y,Color.FromArgb(0,0,0,0));continue;}
     double m=Math.Min(px.R,px.B)-px.G;int r=px.R,b=px.B;if(m>25){int lim=px.G+45;r=Math.Min(r,lim);b=Math.Min(b,lim);}
     o.SetPixel(x,y,Color.FromArgb(255,r,px.G,b));if(x<ax0)ax0=x;if(x>ax1)ax1=x;if(y<ay0)ay0=y;if(y>ay1)ay1=y;}
    int tw=ax1-ax0+1,th=ay1-ay0+1;var t=new Bitmap(tw,th,PixelFormat.Format32bppArgb);var g=Graphics.FromImage(t);g.DrawImage(o,new Rectangle(0,0,tw,th),ax0,ay0,tw,th,GraphicsUnit.Pixel);
    t.Save(Path.Combine(outDir,names[ni]+".png"));res+=names[ni]+":"+tw+"x"+th+" ";ni++;}}
  return res;}}
