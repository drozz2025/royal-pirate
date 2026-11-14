using UnityEngine;
using UnityEngine.UIElements;
namespace RoyalPirate.UI
{
    // Original small vector glyphs: no imported game artwork or font-dependent emoji.
    public sealed class PirateIcon : VisualElement
    {
        public PirateIcon(string kind)
        {
            pickingMode=PickingMode.Ignore; AddToClassList("icon");
            generateVisualContent+=context=> {
                var p=context.painter2D; p.strokeColor=new Color(1,.85f,.4f); p.fillColor=new Color(1,.72f,.15f); p.lineWidth=2.5f;
                float w=contentRect.width,h=contentRect.height; if(w<=0||h<=0)return;
                Vector2 V(float x,float y)=>new Vector2(x*w,y*h);
                void Line(float x,float y,float a,float b) { p.BeginPath();p.MoveTo(V(x,y));p.LineTo(V(a,b));p.Stroke(); }
                void Polygon(params Vector2[] points) { p.BeginPath();p.MoveTo(points[0]);for(int i=1;i<points.Length;i++)p.LineTo(points[i]);p.ClosePath();p.Fill();p.Stroke(); }
                switch(kind)
                {
                    case "gem": Polygon(V(.2f,.2f),V(.8f,.2f),V(.97f,.48f),V(.5f,.94f),V(.03f,.48f)); break;
                    case "ship": Polygon(V(.05f,.7f),V(.95f,.7f),V(.75f,.94f),V(.25f,.94f));Line(.5f,.08f,.5f,.7f);Polygon(V(.55f,.12f),V(.9f,.6f),V(.55f,.6f));break;
                    case "battle": Line(.12f,.12f,.85f,.85f);Line(.85f,.12f,.12f,.85f);Line(.58f,.84f,.85f,.58f);Line(.15f,.58f,.42f,.84f);break;
                    case "chest": Polygon(V(.1f,.3f),V(.9f,.3f),V(.9f,.88f),V(.1f,.88f));p.strokeColor=new Color(.12f,.2f,.35f);Line(.1f,.5f,.9f,.5f);Line(.5f,.4f,.5f,.65f);break;
                    case "hero": Polygon(V(.2f,.3f),V(.5f,.05f),V(.8f,.3f),V(.7f,.6f),V(.3f,.6f));Line(.2f,.92f,.5f,.65f);Line(.5f,.65f,.8f,.92f);break;
                    case "back": Line(.65f,.15f,.3f,.5f);Line(.3f,.5f,.65f,.85f);break;
                    case "build": Line(.18f,.88f,.8f,.15f);Polygon(V(.58f,.08f),V(.95f,.4f),V(.78f,.57f),V(.4f,.25f));break;
                    case "trophy": Polygon(V(.2f,.12f),V(.8f,.12f),V(.7f,.55f),V(.5f,.7f),V(.3f,.55f));Line(.5f,.7f,.5f,.9f);Line(.25f,.93f,.75f,.93f);break;
                    default: Polygon(V(.15f,.15f),V(.85f,.15f),V(.85f,.85f),V(.15f,.85f));p.strokeColor=new Color(.12f,.2f,.35f);Line(.3f,.5f,.7f,.5f);Line(.5f,.3f,.5f,.7f);break;
                }
            };
        }
    }
}
