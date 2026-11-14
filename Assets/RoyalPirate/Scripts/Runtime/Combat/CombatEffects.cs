using UnityEngine;

namespace RoyalPirate.Runtime.Combat
{
    public enum CombatEffectQuality { Off, Low, High }
    public sealed class CombatEffects : MonoBehaviour
    {
        readonly ParticleSystem[] pool=new ParticleSystem[6];
        int cursor;
        Mesh sphereMesh,woodMesh;
        public CombatEffectQuality Quality { get; set; } = CombatEffectQuality.Low;
        public void Initialize(Material material)
        {
            var sample=GameObject.CreatePrimitive(PrimitiveType.Sphere);
            sphereMesh=sample.GetComponent<MeshFilter>().sharedMesh; Destroy(sample);
            sample=GameObject.CreatePrimitive(PrimitiveType.Cube); woodMesh=sample.GetComponent<MeshFilter>().sharedMesh; Destroy(sample);
            for(int i=0;i<pool.Length;i++)
            {
                var go=new GameObject("ImpactParticles_Pooled_"+i); go.transform.SetParent(transform,false);
                var ps=go.AddComponent<ParticleSystem>(); ps.Stop(true,ParticleSystemStopBehavior.StopEmittingAndClear);
                var main=ps.main; main.playOnAwake=false; main.loop=false; main.maxParticles=48; main.simulationSpace=ParticleSystemSimulationSpace.World;
                main.startLifetime=.6f; main.startSpeed=0; main.startSize=.12f;
                var emission=ps.emission; emission.enabled=false;
                var shape=ps.shape; shape.enabled=false;
                var renderer=go.GetComponent<ParticleSystemRenderer>(); renderer.renderMode=ParticleSystemRenderMode.Mesh;
                renderer.mesh=sphereMesh; renderer.sharedMaterial=material; pool[i]=ps;
            }
        }
        public void PlayMuzzle(Vector3 point,Vector3 direction)
        {
            if(Quality==CombatEffectQuality.Off)return;
            var ps=pool[cursor++%pool.Length];ps.Stop(true,ParticleSystemStopBehavior.StopEmittingAndClear);
            ps.GetComponent<ParticleSystemRenderer>().mesh=sphereMesh;
            var main=ps.main;main.gravityModifier=0;
            ps.Emit(new ParticleSystem.EmitParams {position=point,velocity=direction*5,
                startColor=new Color(1,.65f,.08f),startSize=.5f,startLifetime=.12f},1);
            for(int i=0;i<4;i++)ps.Emit(new ParticleSystem.EmitParams {position=point,
                velocity=direction*(1+i*.4f)+Vector3.up*.5f,startColor=new Color(.65f,.65f,.65f),
                startSize=.15f+i*.08f,startLifetime=.4f+i*.1f},1);
            ps.Play();
        }
        public void Play(ProjectileImpact impact)
        {
            if(Quality==CombatEffectQuality.Off || impact.Kind==ImpactKind.Expired) return;
            var ps=pool[cursor++%pool.Length]; ps.Stop(true,ParticleSystemStopBehavior.StopEmittingAndClear); ps.transform.position=impact.Point;
            bool water=impact.Kind==ImpactKind.Water;
            ps.GetComponent<ParticleSystemRenderer>().mesh=water?sphereMesh:woodMesh;
            var main=ps.main; main.gravityModifier=water?1:.4f;
            int count=Quality==CombatEffectQuality.High?24:10;
            for(int i=0;i<count;i++)
            {
                float angle=i*2.399963f;
                ps.Emit(new ParticleSystem.EmitParams { position=impact.Point,
                    velocity=new Vector3(Mathf.Sin(angle)*(1+i%3),2+i%4,Mathf.Cos(angle)*(1+i%3)),
                    startColor=water?new Color(.6f,.9f,1):i%3==0?new Color(1,.5f,.08f):new Color(.4f,.21f,.07f),
                    startSize=water?.10f:.14f,startLifetime=.45f+(i%5)*.12f },1);
            }
            ps.Play();
            if(!water && Quality==CombatEffectQuality.High)
            {
                var smoke=pool[cursor++%pool.Length]; smoke.Stop(true,ParticleSystemStopBehavior.StopEmittingAndClear);
                smoke.GetComponent<ParticleSystemRenderer>().mesh=sphereMesh;
                var smokeMain=smoke.main; smokeMain.gravityModifier=0;
                for(int i=0;i<5;i++) smoke.Emit(new ParticleSystem.EmitParams {position=impact.Point,velocity=new Vector3((i-2)*.15f,1,0),startSize=.25f+i*.10f,startLifetime=1+i*.15f,startColor=new Color(.24f,.25f,.27f)},1);
                smoke.Play();
            }
        }
    }
}
