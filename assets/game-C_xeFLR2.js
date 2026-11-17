const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/browser-pBwlB2M7.js","assets/rolldown-runtime-QTnfLwEv.js"])))=>i.map(i=>d[i]);
import{r as e}from"./rolldown-runtime-QTnfLwEv.js";import{t}from"./preload-helper-aB9ABBk7.js";import{n,t as r}from"./controlsHelp-B1c602Hp.js";import{a as i,c as a,i as o,o as s,s as c}from"./settingsUi-DhLKFY-b.js";import{i as l,r as u,s as d}from"./onlineConfig-r4VemSjm.js";import{t as f}from"./apiBase-bFIzYwhY.js";import{n as p}from"./feedbackCompose-BBVhOw6I.js";import{d as m,f as h,p as g,r as _,s as v}from"./session-4r9sAZVb.js";import{a as y,t as b}from"./profile-0ryOzYAc.js";import{$ as x,$n as S,A as C,An as w,At as T,B as E,C as D,Ct as O,D as k,Dn as A,Dt as j,E as ee,En as te,Et as ne,F as M,Fn as re,G as N,Gn as ie,H as P,I as F,In as ae,J as oe,Jn as I,K as se,Kn as ce,L as le,Ln as ue,Lt as de,M as fe,N as L,Nn as pe,Nt as R,O as z,On as me,Ot as he,P as ge,Pn as _e,Q as ve,Qn as ye,R as be,Rn as xe,Rt as Se,St as Ce,T as we,Tt as Te,U as B,Un as Ee,V as De,Vn as Oe,W as ke,Wn as Ae,X as V,Xn as je,Yn as Me,Z as Ne,Zn as Pe,_ as H,_t as U,a as W,ar as Fe,at as G,b as Ie,bn as Le,bt as Re,c as ze,cr as K,ct as Be,d as Ve,dt as q,er as He,f as Ue,ft as We,gn as Ge,gt as Ke,h as qe,hn as Je,ht as Ye,i as Xe,ir as Ze,it as Qe,j as $e,jn as et,jt as tt,k as nt,kn as rt,kt as it,l as at,lr as ot,lt as st,m as ct,mn as lt,mt as ut,n as dt,nr as ft,nt as pt,o as mt,or as ht,ot as gt,p as _t,pt as J,q as vt,qn as yt,rr as bt,rt as xt,s as St,sr as Ct,st as wt,tr as Tt,tt as Et,u as Dt,ut as Ot,v as kt,vn as At,vt as jt,w as Mt,wt as Nt,x as Pt,xn as Ft,xt as It,y as Y,yn as Lt,yt as Rt,z as zt,zn as Bt}from"./vehiclePhysics-CO8btHMj.js";import{t as Vt}from"./wsUrl-CVoS4IGs.js";import{a as Ht}from"./presence-Cf2dvZpd.js";import{o as Ut}from"./friends-BZDDalBQ.js";import{n as Wt,r as Gt}from"./ui-BOoRCQt-.js";import{g as Kt}from"./organize-B-tzA9LH.js";import{o as qt,t as Jt}from"./ui-gMdpQslX.js";import{o as Yt}from"./versions-BnC_trY2.js";function Xt(){let e=null,t=!1,n=null,r=null;function i(t,a){n(t,a),r=e.requestAnimationFrame(i)}return{start:function(){t!==!0&&n!==null&&e!==null&&(r=e.requestAnimationFrame(i),t=!0)},stop:function(){e!==null&&e.cancelAnimationFrame(r),t=!1},setAnimationLoop:function(e){n=e},setContext:function(t){e=t}}}function Zt(e){let t=new WeakMap;function n(t,n){let r=t.array,i=t.usage,a=r.byteLength,o=e.createBuffer();e.bindBuffer(n,o),e.bufferData(n,r,i),t.onUploadCallback();let s;if(r instanceof Float32Array)s=e.FLOAT;else if(typeof Float16Array<`u`&&r instanceof Float16Array)s=e.HALF_FLOAT;else if(r instanceof Uint16Array)s=t.isFloat16BufferAttribute?e.HALF_FLOAT:e.UNSIGNED_SHORT;else if(r instanceof Int16Array)s=e.SHORT;else if(r instanceof Uint32Array)s=e.UNSIGNED_INT;else if(r instanceof Int32Array)s=e.INT;else if(r instanceof Int8Array)s=e.BYTE;else if(r instanceof Uint8Array)s=e.UNSIGNED_BYTE;else if(r instanceof Uint8ClampedArray)s=e.UNSIGNED_BYTE;else throw Error(`THREE.WebGLAttributes: Unsupported buffer data format: `+r);return{buffer:o,type:s,bytesPerElement:r.BYTES_PER_ELEMENT,version:t.version,size:a}}function r(t,n,r){let i=n.array,a=n.updateRanges;if(e.bindBuffer(r,t),a.length===0)e.bufferSubData(r,0,i);else{a.sort((e,t)=>e.start-t.start);let t=0;for(let e=1;e<a.length;e++){let n=a[t],r=a[e];r.start<=n.start+n.count+1?n.count=Math.max(n.count,r.start+r.count-n.start):(++t,a[t]=r)}a.length=t+1;for(let t=0,n=a.length;t<n;t++){let n=a[t];e.bufferSubData(r,n.start*i.BYTES_PER_ELEMENT,i,n.start,n.count)}n.clearUpdateRanges()}n.onUploadCallback()}function i(e){return e.isInterleavedBufferAttribute&&(e=e.data),t.get(e)}function a(n){n.isInterleavedBufferAttribute&&(n=n.data);let r=t.get(n);r&&(e.deleteBuffer(r.buffer),t.delete(n))}function o(e,i){if(e.isInterleavedBufferAttribute&&(e=e.data),e.isGLBufferAttribute){let n=t.get(e);(!n||n.version<e.version)&&t.set(e,{buffer:e.buffer,type:e.type,bytesPerElement:e.elementSize,version:e.version});return}let a=t.get(e);if(a===void 0)t.set(e,n(e,i));else if(a.version<e.version){if(a.size!==e.array.byteLength)throw Error(`THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.`);r(a.buffer,e,i),a.version=e.version}}return{get:i,remove:a,update:o}}var X={alphahash_fragment:`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,alphahash_pars_fragment:`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,alphamap_fragment:`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,alphamap_pars_fragment:`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,alphatest_fragment:`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,alphatest_pars_fragment:`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,aomap_fragment:`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,aomap_pars_fragment:`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,batching_pars_vertex:`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,batching_vertex:`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,begin_vertex:`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,beginnormal_vertex:`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,bsdfs:`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,iridescence_fragment:`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,bumpmap_pars_fragment:`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,clipping_planes_fragment:`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,clipping_planes_pars_fragment:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,clipping_planes_pars_vertex:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,clipping_planes_vertex:`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,color_fragment:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,color_pars_fragment:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,color_pars_vertex:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,color_vertex:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,common:`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,cube_uv_reflection_fragment:`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,defaultnormal_vertex:`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,displacementmap_pars_vertex:`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,displacementmap_vertex:`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,emissivemap_fragment:`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,emissivemap_pars_fragment:`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,colorspace_fragment:`gl_FragColor = linearToOutputTexel( gl_FragColor );`,colorspace_pars_fragment:`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,envmap_fragment:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,envmap_common_pars_fragment:`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,envmap_pars_fragment:`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,envmap_pars_vertex:`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,envmap_physical_pars_fragment:`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,envmap_vertex:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,fog_vertex:`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,fog_pars_vertex:`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,fog_fragment:`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,fog_pars_fragment:`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,gradientmap_pars_fragment:`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,lightmap_pars_fragment:`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,lights_lambert_fragment:`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,lights_lambert_pars_fragment:`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,lights_pars_begin:`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,lights_toon_fragment:`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,lights_toon_pars_fragment:`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,lights_phong_fragment:`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,lights_phong_pars_fragment:`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,lights_physical_fragment:`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,lights_physical_pars_fragment:`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
		vec3 iridescenceFresnelDielectric;
		vec3 iridescenceFresnelMetallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
vec3 BRDF_GGX_Multiscatter( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 singleScatter = BRDF_GGX( lightDir, viewDir, normal, material );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 dfgV = texture2D( dfgLUT, vec2( material.roughness, dotNV ) ).rg;
	vec2 dfgL = texture2D( dfgLUT, vec2( material.roughness, dotNL ) ).rg;
	vec3 FssEss_V = material.specularColorBlended * dfgV.x + material.specularF90 * dfgV.y;
	vec3 FssEss_L = material.specularColorBlended * dfgL.x + material.specularF90 * dfgL.y;
	float Ess_V = dfgV.x + dfgV.y;
	float Ess_L = dfgL.x + dfgL.y;
	float Ems_V = 1.0 - Ess_V;
	float Ems_L = 1.0 - Ess_L;
	vec3 Favg = material.specularColorBlended + ( 1.0 - material.specularColorBlended ) * 0.047619;
	vec3 Fms = FssEss_V * FssEss_L * Favg / ( 1.0 - Ems_V * Ems_L * Favg + EPSILON );
	float compensationFactor = Ems_V * Ems_L;
	vec3 multiScatter = Fms * compensationFactor;
	return singleScatter + multiScatter;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX_Multiscatter( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnelDielectric, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceFresnelMetallic, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,lights_fragment_begin:`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( material.iridescenceFresnelDielectric, material.iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#ifdef USE_LIGHT_PROBES_GRID
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,lights_fragment_maps:`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,lights_fragment_end:`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,lightprobes_pars_fragment:`#ifdef USE_LIGHT_PROBES_GRID
uniform highp sampler3D probesSH;
uniform vec3 probesMin;
uniform vec3 probesMax;
uniform vec3 probesResolution;
vec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 resMinusOne = res - 1.0;
	vec3 probeSpacing = gridRange / resMinusOne;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );
	uvw = uvw * resMinusOne / res + 0.5 / res;
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,logdepthbuf_fragment:`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,logdepthbuf_pars_fragment:`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_pars_vertex:`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_vertex:`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,map_fragment:`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,map_pars_fragment:`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,map_particle_fragment:`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,map_particle_pars_fragment:`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,metalnessmap_fragment:`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,metalnessmap_pars_fragment:`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,morphinstance_vertex:`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,morphcolor_vertex:`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,morphnormal_vertex:`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,morphtarget_pars_vertex:`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,morphtarget_vertex:`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,normal_fragment_begin:`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,normal_fragment_maps:`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,normal_pars_fragment:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_pars_vertex:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_vertex:`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,normalmap_pars_fragment:`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,clearcoat_normal_fragment_begin:`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,clearcoat_normal_fragment_maps:`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,clearcoat_pars_fragment:`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,iridescence_pars_fragment:`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,opaque_fragment:`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,packing:`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,premultiplied_alpha_fragment:`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,project_vertex:`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,dithering_fragment:`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,dithering_pars_fragment:`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,roughnessmap_fragment:`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,roughnessmap_pars_fragment:`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,shadowmap_pars_fragment:`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,shadowmap_pars_vertex:`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,shadowmap_vertex:`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,shadowmask_pars_fragment:`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,skinbase_vertex:`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,skinning_pars_vertex:`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,skinning_vertex:`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,skinnormal_vertex:`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,specularmap_fragment:`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,specularmap_pars_fragment:`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,tonemapping_fragment:`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,tonemapping_pars_fragment:`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,transmission_fragment:`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,transmission_pars_fragment:`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,uv_pars_fragment:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv_pars_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,worldpos_vertex:`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,background_vert:`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,background_frag:`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,backgroundCube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,backgroundCube_frag:`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,cube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,cube_frag:`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,depth_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,depth_frag:`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,distance_vert:`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,distance_frag:`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,equirect_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,equirect_frag:`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,linedashed_vert:`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,linedashed_frag:`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,meshbasic_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,meshbasic_frag:`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshlambert_vert:`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshlambert_frag:`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshmatcap_vert:`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,meshmatcap_frag:`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshnormal_vert:`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,meshnormal_frag:`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,meshphong_vert:`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshphong_frag:`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshphysical_vert:`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,meshphysical_frag:`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshtoon_vert:`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshtoon_frag:`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,points_vert:`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,points_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,shadow_vert:`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,shadow_frag:`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,sprite_vert:`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,sprite_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`},Z={common:{diffuse:{value:new k(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new q},alphaMap:{value:null},alphaMapTransform:{value:new q},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new q}},envmap:{envMap:{value:null},envMapRotation:{value:new q},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new q}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new q}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new q},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new q},normalScale:{value:new yt(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new q},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new q}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new q}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new q}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new k(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new I},probesMax:{value:new I},probesResolution:{value:new I}},points:{diffuse:{value:new k(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new q},alphaTest:{value:0},uvTransform:{value:new q}},sprite:{diffuse:{value:new k(16777215)},opacity:{value:1},center:{value:new yt(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new q},alphaMap:{value:null},alphaMapTransform:{value:new q},alphaTest:{value:0}}},Qt={basic:{uniforms:ht([Z.common,Z.specularmap,Z.envmap,Z.aomap,Z.lightmap,Z.fog]),vertexShader:X.meshbasic_vert,fragmentShader:X.meshbasic_frag},lambert:{uniforms:ht([Z.common,Z.specularmap,Z.envmap,Z.aomap,Z.lightmap,Z.emissivemap,Z.bumpmap,Z.normalmap,Z.displacementmap,Z.fog,Z.lights,{emissive:{value:new k(0)},envMapIntensity:{value:1}}]),vertexShader:X.meshlambert_vert,fragmentShader:X.meshlambert_frag},phong:{uniforms:ht([Z.common,Z.specularmap,Z.envmap,Z.aomap,Z.lightmap,Z.emissivemap,Z.bumpmap,Z.normalmap,Z.displacementmap,Z.fog,Z.lights,{emissive:{value:new k(0)},specular:{value:new k(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:X.meshphong_vert,fragmentShader:X.meshphong_frag},standard:{uniforms:ht([Z.common,Z.envmap,Z.aomap,Z.lightmap,Z.emissivemap,Z.bumpmap,Z.normalmap,Z.displacementmap,Z.roughnessmap,Z.metalnessmap,Z.fog,Z.lights,{emissive:{value:new k(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:X.meshphysical_vert,fragmentShader:X.meshphysical_frag},toon:{uniforms:ht([Z.common,Z.aomap,Z.lightmap,Z.emissivemap,Z.bumpmap,Z.normalmap,Z.displacementmap,Z.gradientmap,Z.fog,Z.lights,{emissive:{value:new k(0)}}]),vertexShader:X.meshtoon_vert,fragmentShader:X.meshtoon_frag},matcap:{uniforms:ht([Z.common,Z.bumpmap,Z.normalmap,Z.displacementmap,Z.fog,{matcap:{value:null}}]),vertexShader:X.meshmatcap_vert,fragmentShader:X.meshmatcap_frag},points:{uniforms:ht([Z.points,Z.fog]),vertexShader:X.points_vert,fragmentShader:X.points_frag},dashed:{uniforms:ht([Z.common,Z.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:X.linedashed_vert,fragmentShader:X.linedashed_frag},depth:{uniforms:ht([Z.common,Z.displacementmap]),vertexShader:X.depth_vert,fragmentShader:X.depth_frag},normal:{uniforms:ht([Z.common,Z.bumpmap,Z.normalmap,Z.displacementmap,{opacity:{value:1}}]),vertexShader:X.meshnormal_vert,fragmentShader:X.meshnormal_frag},sprite:{uniforms:ht([Z.sprite,Z.fog]),vertexShader:X.sprite_vert,fragmentShader:X.sprite_frag},background:{uniforms:{uvTransform:{value:new q},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:X.background_vert,fragmentShader:X.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new q}},vertexShader:X.backgroundCube_vert,fragmentShader:X.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:X.cube_vert,fragmentShader:X.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:X.equirect_vert,fragmentShader:X.equirect_frag},distance:{uniforms:ht([Z.common,Z.displacementmap,{referencePosition:{value:new I},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:X.distance_vert,fragmentShader:X.distance_frag},shadow:{uniforms:ht([Z.lights,Z.fog,{color:{value:new k(0)},opacity:{value:1}}]),vertexShader:X.shadow_vert,fragmentShader:X.shadow_frag}};Qt.physical={uniforms:ht([Qt.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new q},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new q},clearcoatNormalScale:{value:new yt(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new q},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new q},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new q},sheen:{value:0},sheenColor:{value:new k(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new q},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new q},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new q},transmissionSamplerSize:{value:new yt},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new q},attenuationDistance:{value:0},attenuationColor:{value:new k(0)},specularColor:{value:new k(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new q},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new q},anisotropyVector:{value:new yt},anisotropyMap:{value:null},anisotropyMapTransform:{value:new q}}]),vertexShader:X.meshphysical_vert,fragmentShader:X.meshphysical_frag};var $t={r:0,b:0,g:0},en=new We,tn=new q;tn.set(-1,0,0,0,1,0,0,0,1);function nn(e,t,n,r,i,a){let o=new k(0),s=i===!0?0:1,c,l,u=null,d=0,f=null;function p(e){let n=e.isScene===!0?e.background:null;if(n&&n.isTexture){let r=e.backgroundBlurriness>0;n=t.get(n,r)}return n}function m(t){let r=!1,i=p(t);i===null?g(o,s):i&&i.isColor&&(g(i,1),r=!0);let c=e.xr.getEnvironmentBlendMode();c===`additive`?n.buffers.color.setClear(0,0,0,1,a):c===`alpha-blend`&&n.buffers.color.setClear(0,0,0,0,a),(e.autoClear||r)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil))}function h(t,n){let i=p(n);i&&(i.isCubeTexture||i.mapping===306)?(l===void 0&&(l=new J(new Y(1,1,1),new rt({name:`BackgroundCubeMaterial`,uniforms:S(Qt.backgroundCube.uniforms),vertexShader:Qt.backgroundCube.vertexShader,fragmentShader:Qt.backgroundCube.fragmentShader,side:1,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute(`normal`),l.geometry.deleteAttribute(`uv`),l.onBeforeRender=function(e,t,n){this.matrixWorld.copyPosition(n.matrixWorld)},Object.defineProperty(l.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(l)),l.material.uniforms.envMap.value=i,l.material.uniforms.backgroundBlurriness.value=n.backgroundBlurriness,l.material.uniforms.backgroundIntensity.value=n.backgroundIntensity,l.material.uniforms.backgroundRotation.value.setFromMatrix4(en.makeRotationFromEuler(n.backgroundRotation)).transpose(),i.isCubeTexture&&i.isRenderTargetTexture===!1&&l.material.uniforms.backgroundRotation.value.premultiply(tn),l.material.toneMapped=z.getTransfer(i.colorSpace)!==A,(u!==i||d!==i.version||f!==e.toneMapping)&&(l.material.needsUpdate=!0,u=i,d=i.version,f=e.toneMapping),l.layers.enableAll(),t.unshift(l,l.geometry,l.material,0,0,null)):i&&i.isTexture&&(c===void 0&&(c=new J(new j(2,2),new rt({name:`BackgroundMaterial`,uniforms:S(Qt.background.uniforms),vertexShader:Qt.background.vertexShader,fragmentShader:Qt.background.fragmentShader,side:0,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute(`normal`),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(c)),c.material.uniforms.t2D.value=i,c.material.uniforms.backgroundIntensity.value=n.backgroundIntensity,c.material.toneMapped=z.getTransfer(i.colorSpace)!==A,i.matrixAutoUpdate===!0&&i.updateMatrix(),c.material.uniforms.uvTransform.value.copy(i.matrix),(u!==i||d!==i.version||f!==e.toneMapping)&&(c.material.needsUpdate=!0,u=i,d=i.version,f=e.toneMapping),c.layers.enableAll(),t.unshift(c,c.geometry,c.material,0,0,null))}function g(t,r){t.getRGB($t,Ze(e)),n.buffers.color.setClear($t.r,$t.g,$t.b,r,a)}function _(){l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return o},setClearColor:function(e,t=1){o.set(e),s=t,g(o,s)},getClearAlpha:function(){return s},setClearAlpha:function(e){s=e,g(o,s)},render:m,addToRenderList:h,dispose:_}}function rn(e,t){let n=e.getParameter(e.MAX_VERTEX_ATTRIBS),r={},i=f(null),a=i,o=!1;function s(n,r,i,s,c){let u=!1,f=d(n,s,i,r);a!==f&&(a=f,l(a.object)),u=p(n,s,i,c),u&&m(n,s,i,c),c!==null&&t.update(c,e.ELEMENT_ARRAY_BUFFER),(u||o)&&(o=!1,b(n,r,i,s),c!==null&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t.get(c).buffer))}function c(){return e.createVertexArray()}function l(t){return e.bindVertexArray(t)}function u(t){return e.deleteVertexArray(t)}function d(e,t,n,i){let a=i.wireframe===!0,o=r[t.id];o===void 0&&(o={},r[t.id]=o);let s=e.isInstancedMesh===!0?e.id:0,l=o[s];l===void 0&&(l={},o[s]=l);let u=l[n.id];u===void 0&&(u={},l[n.id]=u);let d=u[a];return d===void 0&&(d=f(c()),u[a]=d),d}function f(e){let t=[],r=[],i=[];for(let e=0;e<n;e++)t[e]=0,r[e]=0,i[e]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:t,enabledAttributes:r,attributeDivisors:i,object:e,attributes:{},index:null}}function p(e,t,n,r){let i=a.attributes,o=t.attributes,s=0,c=n.getAttributes();for(let t in c)if(c[t].location>=0){let n=i[t],r=o[t];if(r===void 0&&(t===`instanceMatrix`&&e.instanceMatrix&&(r=e.instanceMatrix),t===`instanceColor`&&e.instanceColor&&(r=e.instanceColor)),n===void 0||n.attribute!==r||r&&n.data!==r.data)return!0;s++}return a.attributesNum!==s||a.index!==r}function m(e,t,n,r){let i={},o=t.attributes,s=0,c=n.getAttributes();for(let t in c)if(c[t].location>=0){let n=o[t];n===void 0&&(t===`instanceMatrix`&&e.instanceMatrix&&(n=e.instanceMatrix),t===`instanceColor`&&e.instanceColor&&(n=e.instanceColor));let r={};r.attribute=n,n&&n.data&&(r.data=n.data),i[t]=r,s++}a.attributes=i,a.attributesNum=s,a.index=r}function h(){let e=a.newAttributes;for(let t=0,n=e.length;t<n;t++)e[t]=0}function g(e){_(e,0)}function _(t,n){let r=a.newAttributes,i=a.enabledAttributes,o=a.attributeDivisors;r[t]=1,i[t]===0&&(e.enableVertexAttribArray(t),i[t]=1),o[t]!==n&&(e.vertexAttribDivisor(t,n),o[t]=n)}function v(){let t=a.newAttributes,n=a.enabledAttributes;for(let r=0,i=n.length;r<i;r++)n[r]!==t[r]&&(e.disableVertexAttribArray(r),n[r]=0)}function y(t,n,r,i,a,o,s){s===!0?e.vertexAttribIPointer(t,n,r,a,o):e.vertexAttribPointer(t,n,r,i,a,o)}function b(n,r,i,a){h();let o=a.attributes,s=i.getAttributes(),c=r.defaultAttributeValues;for(let r in s){let i=s[r];if(i.location>=0){let s=o[r];if(s===void 0&&(r===`instanceMatrix`&&n.instanceMatrix&&(s=n.instanceMatrix),r===`instanceColor`&&n.instanceColor&&(s=n.instanceColor)),s!==void 0){let r=s.normalized,o=s.itemSize,c=t.get(s);if(c===void 0)continue;let l=c.buffer,u=c.type,d=c.bytesPerElement,f=u===e.INT||u===e.UNSIGNED_INT||s.gpuType===1013;if(s.isInterleavedBufferAttribute){let t=s.data,c=t.stride,p=s.offset;if(t.isInstancedInterleavedBuffer){for(let e=0;e<i.locationSize;e++)_(i.location+e,t.meshPerAttribute);n.isInstancedMesh!==!0&&a._maxInstanceCount===void 0&&(a._maxInstanceCount=t.meshPerAttribute*t.count)}else for(let e=0;e<i.locationSize;e++)g(i.location+e);e.bindBuffer(e.ARRAY_BUFFER,l);for(let e=0;e<i.locationSize;e++)y(i.location+e,o/i.locationSize,u,r,c*d,(p+o/i.locationSize*e)*d,f)}else{if(s.isInstancedBufferAttribute){for(let e=0;e<i.locationSize;e++)_(i.location+e,s.meshPerAttribute);n.isInstancedMesh!==!0&&a._maxInstanceCount===void 0&&(a._maxInstanceCount=s.meshPerAttribute*s.count)}else for(let e=0;e<i.locationSize;e++)g(i.location+e);e.bindBuffer(e.ARRAY_BUFFER,l);for(let e=0;e<i.locationSize;e++)y(i.location+e,o/i.locationSize,u,r,o*d,o/i.locationSize*e*d,f)}}else if(c!==void 0){let t=c[r];if(t!==void 0)switch(t.length){case 2:e.vertexAttrib2fv(i.location,t);break;case 3:e.vertexAttrib3fv(i.location,t);break;case 4:e.vertexAttrib4fv(i.location,t);break;default:e.vertexAttrib1fv(i.location,t)}}}}v()}function x(){T();for(let e in r){let t=r[e];for(let e in t){let n=t[e];for(let e in n){let t=n[e];for(let e in t)u(t[e].object),delete t[e];delete n[e]}}delete r[e]}}function S(e){if(r[e.id]===void 0)return;let t=r[e.id];for(let e in t){let n=t[e];for(let e in n){let t=n[e];for(let e in t)u(t[e].object),delete t[e];delete n[e]}}delete r[e.id]}function C(e){for(let t in r){let n=r[t];for(let t in n){let r=n[t];if(r[e.id]===void 0)continue;let i=r[e.id];for(let e in i)u(i[e].object),delete i[e];delete r[e.id]}}}function w(e){for(let t in r){let n=r[t],i=e.isInstancedMesh===!0?e.id:0,a=n[i];if(a!==void 0){for(let e in a){let t=a[e];for(let e in t)u(t[e].object),delete t[e];delete a[e]}delete n[i],Object.keys(n).length===0&&delete r[t]}}}function T(){E(),o=!0,a!==i&&(a=i,l(a.object))}function E(){i.geometry=null,i.program=null,i.wireframe=!1}return{setup:s,reset:T,resetDefaultState:E,dispose:x,releaseStatesOfGeometry:S,releaseStatesOfObject:w,releaseStatesOfProgram:C,initAttributes:h,enableAttribute:g,disableUnusedAttributes:v}}function an(e,t,n){let r;function i(e){r=e}function a(t,i){e.drawArrays(r,t,i),n.update(i,r,1)}function o(t,i,a){a!==0&&(e.drawArraysInstanced(r,t,i,a),n.update(i,r,a))}function s(e,i,a){if(a===0)return;t.get(`WEBGL_multi_draw`).multiDrawArraysWEBGL(r,e,0,i,0,a);let o=0;for(let e=0;e<a;e++)o+=i[e];n.update(o,r,1)}this.setMode=i,this.render=a,this.renderInstances=o,this.renderMultiDraw=s}function on(e,t,n,r){let i;function a(){if(i!==void 0)return i;if(t.has(`EXT_texture_filter_anisotropic`)===!0){let n=t.get(`EXT_texture_filter_anisotropic`);i=e.getParameter(n.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function o(t){return!(t!==1023&&r.convert(t)!==e.getParameter(e.IMPLEMENTATION_COLOR_READ_FORMAT))}function s(n){let i=n===1016&&(t.has(`EXT_color_buffer_half_float`)||t.has(`EXT_color_buffer_float`));return!(n!==1009&&r.convert(n)!==e.getParameter(e.IMPLEMENTATION_COLOR_READ_TYPE)&&n!==1015&&!i)}function c(t){if(t===`highp`){if(e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.HIGH_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.HIGH_FLOAT).precision>0)return`highp`;t=`mediump`}return t===`mediump`&&e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.MEDIUM_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.MEDIUM_FLOAT).precision>0?`mediump`:`lowp`}let l=n.precision===void 0?`highp`:n.precision,u=c(l);u!==l&&(K(`WebGLRenderer:`,l,`not supported, using`,u,`instead.`),l=u);let d=n.logarithmicDepthBuffer===!0,f=n.reversedDepthBuffer===!0&&t.has(`EXT_clip_control`);n.reversedDepthBuffer===!0&&f===!1&&K(`WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.`);let p=e.getParameter(e.MAX_TEXTURE_IMAGE_UNITS),m=e.getParameter(e.MAX_VERTEX_TEXTURE_IMAGE_UNITS),h=e.getParameter(e.MAX_TEXTURE_SIZE),g=e.getParameter(e.MAX_CUBE_MAP_TEXTURE_SIZE),_=e.getParameter(e.MAX_VERTEX_ATTRIBS),v=e.getParameter(e.MAX_VERTEX_UNIFORM_VECTORS),y=e.getParameter(e.MAX_VARYING_VECTORS),b=e.getParameter(e.MAX_FRAGMENT_UNIFORM_VECTORS),x=e.getParameter(e.MAX_SAMPLES),S=e.getParameter(e.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:a,getMaxPrecision:c,textureFormatReadable:o,textureTypeReadable:s,precision:l,logarithmicDepthBuffer:d,reversedDepthBuffer:f,maxTextures:p,maxVertexTextures:m,maxTextureSize:h,maxCubemapSize:g,maxAttributes:_,maxVertexUniforms:v,maxVaryings:y,maxFragmentUniforms:b,maxSamples:x,samples:S}}function sn(e){let t=this,n=null,r=0,i=!1,a=!1,o=new ne,s=new q,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(e,t){let n=e.length!==0||t||r!==0||i;return i=t,r=e.length,n},this.beginShadows=function(){a=!0,u(null)},this.endShadows=function(){a=!1},this.setGlobalState=function(e,t){n=u(e,t,0)},this.setState=function(t,o,s){let d=t.clippingPlanes,f=t.clipIntersection,p=t.clipShadows,m=e.get(t);if(!i||d===null||d.length===0||a&&!p)a?u(null):l();else{let e=a?0:r,t=e*4,i=m.clippingState||null;c.value=i,i=u(d,o,t,s);for(let e=0;e!==t;++e)i[e]=n[e];m.clippingState=i,this.numIntersection=f?this.numPlanes:0,this.numPlanes+=e}};function l(){c.value!==n&&(c.value=n,c.needsUpdate=r>0),t.numPlanes=r,t.numIntersection=0}function u(e,n,r,i){let a=e===null?0:e.length,l=null;if(a!==0){if(l=c.value,i!==!0||l===null){let t=r+a*4,i=n.matrixWorldInverse;s.getNormalMatrix(i),(l===null||l.length<t)&&(l=new Float32Array(t));for(let t=0,n=r;t!==a;++t,n+=4)o.copy(e[t]).applyMatrix4(i,s),o.normal.toArray(l,n),l[n+3]=o.constant}c.value=l,c.needsUpdate=!0}return t.numPlanes=a,t.numIntersection=0,l}}var cn=4,ln=[.125,.215,.35,.446,.526,.582],un=20,dn=256,fn=new O,pn=new k,mn=null,hn=0,gn=0,_n=!1,vn=new I,yn=class{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,n=.1,r=100,i={}){let{size:a=256,position:o=vn}=i;mn=this._renderer.getRenderTarget(),hn=this._renderer.getActiveCubeFace(),gn=this._renderer.getActiveMipmapLevel(),_n=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(a);let s=this._allocateTargets();return s.depthBuffer=!0,this._sceneToCubeUV(e,n,r,s,o),t>0&&this._blur(s,0,0,t),this._applyPMREM(s),this._cleanup(s),s}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=En(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Tn(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=2**this._lodMax}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(mn,hn,gn),this._renderer.xr.enabled=_n,e.scissorTest=!1,Sn(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===301||e.mapping===302?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),mn=this._renderer.getRenderTarget(),hn=this._renderer.getActiveCubeFace(),gn=this._renderer.getActiveMipmapLevel(),_n=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){let e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:G,minFilter:G,generateMipmaps:!1,type:Ne,format:de,colorSpace:Be,depthBuffer:!1},r=xn(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=xn(e,t,n);let{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=bn(r)),this._blurMaterial=wn(r,e,t),this._ggxMaterial=Cn(r,e,t)}return r}_compileMaterial(e){let t=new J(new Pt,e);this._renderer.compile(t,fn)}_sceneToCubeUV(e,t,n,r,i){let a=new Te(90,1,t,n),o=[1,-1,1,1,1,1],s=[1,1,1,-1,-1,-1],c=this._renderer,l=c.autoClear,u=c.toneMapping;c.getClearColor(pn),c.toneMapping=0,c.autoClear=!1,c.state.buffers.depth.getReversed()&&(c.setRenderTarget(r),c.clearDepth(),c.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new J(new Y,new ut({name:`PMREM.Background`,side:1,depthWrite:!1,depthTest:!1})));let d=this._backgroundBox,f=d.material,p=!1,m=e.background;m?m.isColor&&(f.color.copy(m),e.background=null,p=!0):(f.color.copy(pn),p=!0);for(let t=0;t<6;t++){let n=t%3;n===0?(a.up.set(0,o[t],0),a.position.set(i.x,i.y,i.z),a.lookAt(i.x+s[t],i.y,i.z)):n===1?(a.up.set(0,0,o[t]),a.position.set(i.x,i.y,i.z),a.lookAt(i.x,i.y+s[t],i.z)):(a.up.set(0,o[t],0),a.position.set(i.x,i.y,i.z),a.lookAt(i.x,i.y,i.z+s[t]));let l=this._cubeSize;Sn(r,n*l,t>2?l:0,l,l),c.setRenderTarget(r),p&&c.render(d,a),c.render(e,a)}c.toneMapping=u,c.autoClear=l,e.background=m}_textureToCubeUV(e,t){let n=this._renderer,r=e.mapping===301||e.mapping===302;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=En()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Tn());let i=r?this._cubemapMaterial:this._equirectMaterial,a=this._lodMeshes[0];a.material=i;let o=i.uniforms;o.envMap.value=e;let s=this._cubeSize;Sn(t,0,0,3*s,2*s),n.setRenderTarget(t),n.render(a,fn)}_applyPMREM(e){let t=this._renderer,n=t.autoClear;t.autoClear=!1;let r=this._lodMeshes.length;for(let t=1;t<r;t++)this._applyGGXFilter(e,t-1,t);t.autoClear=n}_applyGGXFilter(e,t,n){let r=this._renderer,i=this._pingPongRenderTarget,a=this._ggxMaterial,o=this._lodMeshes[n];o.material=a;let s=a.uniforms,c=n/(this._lodMeshes.length-1),l=t/(this._lodMeshes.length-1),u=Math.sqrt(c*c-l*l)*(0+c*1.25),{_lodMax:d}=this,f=this._sizeLods[n],p=3*f*(n>d-cn?n-d+cn:0),m=4*(this._cubeSize-f);s.envMap.value=e.texture,s.roughness.value=u,s.mipInt.value=d-t,Sn(i,p,m,3*f,2*f),r.setRenderTarget(i),r.render(o,fn),s.envMap.value=i.texture,s.roughness.value=0,s.mipInt.value=d-n,Sn(e,p,m,3*f,2*f),r.setRenderTarget(e),r.render(o,fn)}_blur(e,t,n,r,i){let a=this._pingPongRenderTarget;this._halfBlur(e,a,t,n,r,`latitudinal`,i),this._halfBlur(a,e,n,n,r,`longitudinal`,i)}_halfBlur(e,t,n,r,i,a,o){let s=this._renderer,c=this._blurMaterial;a!==`latitudinal`&&a!==`longitudinal`&&ft(`blur direction must be either latitudinal or longitudinal!`);let l=this._lodMeshes[r];l.material=c;let u=c.uniforms,d=this._sizeLods[n]-1,f=isFinite(i)?Math.PI/(2*d):2*Math.PI/(2*un-1),p=i/f,m=isFinite(i)?1+Math.floor(3*p):un;m>un&&K(`sigmaRadians, ${i}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${un}`);let h=[],g=0;for(let e=0;e<un;++e){let t=e/p,n=Math.exp(-t*t/2);h.push(n),e===0?g+=n:e<m&&(g+=2*n)}for(let e=0;e<h.length;e++)h[e]=h[e]/g;u.envMap.value=e.texture,u.samples.value=m,u.weights.value=h,u.latitudinal.value=a===`latitudinal`,o&&(u.poleAxis.value=o);let{_lodMax:_}=this;u.dTheta.value=f,u.mipInt.value=_-n;let v=this._sizeLods[r];Sn(t,3*v*(r>_-cn?r-_+cn:0),4*(this._cubeSize-v),3*v,2*v),s.setRenderTarget(t),s.render(l,fn)}};function bn(e){let t=[],n=[],r=[],i=e,a=e-cn+1+ln.length;for(let o=0;o<a;o++){let a=2**i;t.push(a);let s=1/a;o>e-cn?s=ln[o-e+cn-1]:o===0&&(s=0),n.push(s);let c=1/(a-2),l=-c,u=1+c,d=[l,l,u,l,u,u,l,l,u,u,l,u],f=new Float32Array(108),p=new Float32Array(72),m=new Float32Array(36);for(let e=0;e<6;e++){let t=e%3*2/3-1,n=e>2?0:-1,r=[t,n,0,t+2/3,n,0,t+2/3,n+1,0,t,n,0,t+2/3,n+1,0,t,n+1,0];f.set(r,18*e),p.set(d,12*e);let i=[e,e,e,e,e,e];m.set(i,6*e)}let h=new Pt;h.setAttribute(`position`,new Ie(f,3)),h.setAttribute(`uv`,new Ie(p,2)),h.setAttribute(`faceIndex`,new Ie(m,1)),r.push(new J(h,null)),i>cn&&i--}return{lodMeshes:r,sizeLods:t,sigmas:n}}function xn(e,t,n){let r=new Pe(e,t,n);return r.texture.mapping=306,r.texture.name=`PMREM.cubeUv`,r.scissorTest=!0,r}function Sn(e,t,n,r,i){e.viewport.set(t,n,r,i),e.scissor.set(t,n,r,i)}function Cn(e,t,n){return new rt({name:`PMREMGGXConvolution`,defines:{GGX_SAMPLES:dn,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/n,CUBEUV_MAX_MIP:`${e}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:Dn(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function wn(e,t,n){let r=new Float32Array(un),i=new I(0,1,0);return new rt({name:`SphericalGaussianBlur`,defines:{n:un,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/n,CUBEUV_MAX_MIP:`${e}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:r},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:i}},vertexShader:Dn(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function Tn(){return new rt({name:`EquirectangularToCubeUV`,uniforms:{envMap:{value:null}},vertexShader:Dn(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function En(){return new rt({name:`CubemapToCubeUV`,uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Dn(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function Dn(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}var On=class extends Pe{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;let n={width:e,height:e,depth:1},r=[n,n,n,n,n,n];this.texture=new fe(r),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new Y(5,5,5),i=new rt({name:`CubemapFromEquirect`,uniforms:S(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:1,blending:0});i.uniforms.tEquirect.value=t;let a=new J(r,i),o=t.minFilter;return t.minFilter===1008&&(t.minFilter=G),new C(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t=!0,n=!0,r=!0){let i=e.getRenderTarget();for(let i=0;i<6;i++)e.setRenderTarget(this,i),e.clear(t,n,r);e.setRenderTarget(i)}};function kn(e){let t=new WeakMap,n=new WeakMap,r=null;function i(e,t=!1){return e==null?null:t?o(e):a(e)}function a(n){if(n&&n.isTexture){let r=n.mapping;if(r===303||r===304)if(t.has(n)){let e=t.get(n).texture;return s(e,n.mapping)}else{let r=n.image;if(r&&r.height>0){let i=new On(r.height);return i.fromEquirectangularTexture(e,n),t.set(n,i),n.addEventListener(`dispose`,l),s(i.texture,n.mapping)}else return null}}return n}function o(t){if(t&&t.isTexture){let i=t.mapping,a=i===303||i===304,o=i===301||i===302;if(a||o){let i=n.get(t),s=i===void 0?0:i.texture.pmremVersion;if(t.isRenderTargetTexture&&t.pmremVersion!==s)return r===null&&(r=new yn(e)),i=a?r.fromEquirectangular(t,i):r.fromCubemap(t,i),i.texture.pmremVersion=t.pmremVersion,n.set(t,i),i.texture;if(i!==void 0)return i.texture;{let s=t.image;return a&&s&&s.height>0||o&&s&&c(s)?(r===null&&(r=new yn(e)),i=a?r.fromEquirectangular(t):r.fromCubemap(t),i.texture.pmremVersion=t.pmremVersion,n.set(t,i),t.addEventListener(`dispose`,u),i.texture):null}}}return t}function s(e,t){return t===303?e.mapping=301:t===304&&(e.mapping=302),e}function c(e){let t=0;for(let n=0;n<6;n++)e[n]!==void 0&&t++;return t===6}function l(e){let n=e.target;n.removeEventListener(`dispose`,l);let r=t.get(n);r!==void 0&&(t.delete(n),r.dispose())}function u(e){let t=e.target;t.removeEventListener(`dispose`,u);let r=n.get(t);r!==void 0&&(n.delete(t),r.dispose())}function d(){t=new WeakMap,n=new WeakMap,r!==null&&(r.dispose(),r=null)}return{get:i,dispose:d}}function An(e){let t={};function n(n){if(t[n]!==void 0)return t[n];let r=e.getExtension(n);return t[n]=r,r}return{has:function(e){return n(e)!==null},init:function(){n(`EXT_color_buffer_float`),n(`WEBGL_clip_cull_distance`),n(`OES_texture_float_linear`),n(`EXT_color_buffer_half_float`),n(`WEBGL_multisampled_render_to_texture`),n(`WEBGL_render_shared_exponent`)},get:function(e){let t=n(e);return t===null&&ot(`WebGLRenderer: `+e+` extension not supported.`),t}}}function jn(e,t,n,r){let i={},a=new WeakMap;function o(e){let s=e.target;s.index!==null&&t.remove(s.index);for(let e in s.attributes)t.remove(s.attributes[e]);s.removeEventListener(`dispose`,o),delete i[s.id];let c=a.get(s);c&&(t.remove(c),a.delete(s)),r.releaseStatesOfGeometry(s),s.isInstancedBufferGeometry===!0&&delete s._maxInstanceCount,n.memory.geometries--}function s(e,t){return i[t.id]===!0?t:(t.addEventListener(`dispose`,o),i[t.id]=!0,n.memory.geometries++,t)}function c(n){let r=n.attributes;for(let n in r)t.update(r[n],e.ARRAY_BUFFER)}function l(e){let n=[],r=e.index,i=e.attributes.position,o=0;if(i===void 0)return;if(r!==null){let e=r.array;o=r.version;for(let t=0,r=e.length;t<r;t+=3){let r=e[t+0],i=e[t+1],a=e[t+2];n.push(r,i,i,a,a,r)}}else{let e=i.array;o=i.version;for(let t=0,r=e.length/3-1;t<r;t+=3){let e=t+0,r=t+1,i=t+2;n.push(e,r,r,i,i,e)}}let s=new(i.count>=65535?ue:ae)(n,1);s.version=o;let c=a.get(e);c&&t.remove(c),a.set(e,s)}function u(e){let t=a.get(e);if(t){let n=e.index;n!==null&&t.version<n.version&&l(e)}else l(e);return a.get(e)}return{get:s,update:c,getWireframeAttribute:u}}function Mn(e,t,n){let r;function i(e){r=e}let a,o;function s(e){a=e.type,o=e.bytesPerElement}function c(t,i){e.drawElements(r,i,a,t*o),n.update(i,r,1)}function l(t,i,s){s!==0&&(e.drawElementsInstanced(r,i,a,t*o,s),n.update(i,r,s))}function u(e,i,o){if(o===0)return;t.get(`WEBGL_multi_draw`).multiDrawElementsWEBGL(r,i,0,a,e,0,o);let s=0;for(let e=0;e<o;e++)s+=i[e];n.update(s,r,1)}this.setMode=i,this.setIndex=s,this.render=c,this.renderInstances=l,this.renderMultiDraw=u}function Nn(e){let t={geometries:0,textures:0},n={frame:0,calls:0,triangles:0,points:0,lines:0};function r(t,r,i){switch(n.calls++,r){case e.TRIANGLES:n.triangles+=t/3*i;break;case e.LINES:n.lines+=t/2*i;break;case e.LINE_STRIP:n.lines+=i*(t-1);break;case e.LINE_LOOP:n.lines+=i*t;break;case e.POINTS:n.points+=i*t;break;default:ft(`WebGLInfo: Unknown draw mode:`,r);break}}function i(){n.calls=0,n.triangles=0,n.points=0,n.lines=0}return{memory:t,render:n,programs:null,autoReset:!0,reset:i,update:r}}function Pn(e,t,n){let r=new WeakMap,i=new Me;function a(a,o,s){let c=a.morphTargetInfluences,l=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,u=l===void 0?0:l.length,d=r.get(o);if(d===void 0||d.count!==u){d!==void 0&&d.texture.dispose();let e=o.morphAttributes.position!==void 0,n=o.morphAttributes.normal!==void 0,a=o.morphAttributes.color!==void 0,s=o.morphAttributes.position||[],c=o.morphAttributes.normal||[],l=o.morphAttributes.color||[],f=0;e===!0&&(f=1),n===!0&&(f=2),a===!0&&(f=3);let p=o.attributes.position.count*f,m=1;p>t.maxTextureSize&&(m=Math.ceil(p/t.maxTextureSize),p=t.maxTextureSize);let h=new Float32Array(p*m*4*u),g=new M(h,p,m,u);g.type=se,g.needsUpdate=!0;let _=f*4;for(let t=0;t<u;t++){let r=s[t],o=c[t],u=l[t],d=p*m*4*t;for(let t=0;t<r.count;t++){let s=t*_;e===!0&&(i.fromBufferAttribute(r,t),h[d+s+0]=i.x,h[d+s+1]=i.y,h[d+s+2]=i.z,h[d+s+3]=0),n===!0&&(i.fromBufferAttribute(o,t),h[d+s+4]=i.x,h[d+s+5]=i.y,h[d+s+6]=i.z,h[d+s+7]=0),a===!0&&(i.fromBufferAttribute(u,t),h[d+s+8]=i.x,h[d+s+9]=i.y,h[d+s+10]=i.z,h[d+s+11]=u.itemSize===4?i.w:1)}}d={count:u,texture:g,size:new yt(p,m)},r.set(o,d);function v(){g.dispose(),r.delete(o),o.removeEventListener(`dispose`,v)}o.addEventListener(`dispose`,v)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)s.getUniforms().setValue(e,`morphTexture`,a.morphTexture,n);else{let t=0;for(let e=0;e<c.length;e++)t+=c[e];let n=o.morphTargetsRelative?1:1-t;s.getUniforms().setValue(e,`morphTargetBaseInfluence`,n),s.getUniforms().setValue(e,`morphTargetInfluences`,c)}s.getUniforms().setValue(e,`morphTargetsTexture`,d.texture,n),s.getUniforms().setValue(e,`morphTargetsTextureSize`,d.size)}return{update:a}}function Fn(e,t,n,r,i){let a=new WeakMap;function o(r){let o=i.render.frame,s=r.geometry,l=t.get(r,s);if(a.get(l)!==o&&(t.update(l),a.set(l,o)),r.isInstancedMesh&&(r.hasEventListener(`dispose`,c)===!1&&r.addEventListener(`dispose`,c),a.get(r)!==o&&(n.update(r.instanceMatrix,e.ARRAY_BUFFER),r.instanceColor!==null&&n.update(r.instanceColor,e.ARRAY_BUFFER),a.set(r,o))),r.isSkinnedMesh){let e=r.skeleton;a.get(e)!==o&&(e.update(),a.set(e,o))}return l}function s(){a=new WeakMap}function c(e){let t=e.target;t.removeEventListener(`dispose`,c),r.releaseStatesOfObject(t),n.remove(t.instanceMatrix),t.instanceColor!==null&&n.remove(t.instanceColor)}return{update:o,dispose:s}}var In={1:`LINEAR_TONE_MAPPING`,2:`REINHARD_TONE_MAPPING`,3:`CINEON_TONE_MAPPING`,4:`ACES_FILMIC_TONE_MAPPING`,6:`AGX_TONE_MAPPING`,7:`NEUTRAL_TONE_MAPPING`,5:`CUSTOM_TONE_MAPPING`};function Ln(e,t,n,r,i,a){let o=new Pe(t,n,{type:e,depthBuffer:i,stencilBuffer:a,samples:r?4:0,depthTexture:i?new zt(t,n):void 0}),s=new Pe(t,n,{type:Ne,depthBuffer:!1,stencilBuffer:!1}),c=new Pt;c.setAttribute(`position`,new N([-1,3,0,-1,-1,0,3,-1,0],3)),c.setAttribute(`uv`,new N([0,2,0,0,2,0],2));let l=new Ge({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),u=new J(c,l),d=new O(-1,1,1,-1,0,1),f=null,p=null,m=!1,h,g=null,_=[],v=!1;this.setSize=function(e,t){o.setSize(e,t),s.setSize(e,t);for(let n=0;n<_.length;n++){let r=_[n];r.setSize&&r.setSize(e,t)}},this.setEffects=function(e){_=e,v=_.length>0&&_[0].isRenderPass===!0;let t=o.width,n=o.height;for(let e=0;e<_.length;e++){let r=_[e];r.setSize&&r.setSize(t,n)}},this.begin=function(e,t){if(m||e.toneMapping===0&&_.length===0)return!1;if(g=t,t!==null){let e=t.width,n=t.height;(o.width!==e||o.height!==n)&&this.setSize(e,n)}return v===!1&&e.setRenderTarget(o),h=e.toneMapping,e.toneMapping=0,!0},this.hasRenderPass=function(){return v},this.end=function(e,t){e.toneMapping=h,m=!0;let n=o,r=s;for(let i=0;i<_.length;i++){let a=_[i];if(a.enabled!==!1&&(a.render(e,r,n,t),a.needsSwap!==!1)){let e=n;n=r,r=e}}if(f!==e.outputColorSpace||p!==e.toneMapping){f=e.outputColorSpace,p=e.toneMapping,l.defines={},z.getTransfer(f)===`srgb`&&(l.defines.SRGB_TRANSFER=``);let t=In[p];t&&(l.defines[t]=``),l.needsUpdate=!0}l.uniforms.tDiffuse.value=n.texture,e.setRenderTarget(g),e.render(u,d),g=null,m=!1},this.isCompositing=function(){return m},this.dispose=function(){o.depthTexture&&o.depthTexture.dispose(),o.dispose(),s.dispose(),c.dispose(),l.dispose()}}var Rn=new _e,zn=new zt(1,1),Bn=new M,Vn=new ge,Hn=new fe,Un=[],Wn=[],Gn=new Float32Array(16),Kn=new Float32Array(9),qn=new Float32Array(4);function Jn(e,t,n){let r=e[0];if(r<=0||r>0)return e;let i=t*n,a=Un[i];if(a===void 0&&(a=new Float32Array(i),Un[i]=a),t!==0){r.toArray(a,0);for(let r=1,i=0;r!==t;++r)i+=n,e[r].toArray(a,i)}return a}function Yn(e,t){if(e.length!==t.length)return!1;for(let n=0,r=e.length;n<r;n++)if(e[n]!==t[n])return!1;return!0}function Xn(e,t){for(let n=0,r=t.length;n<r;n++)e[n]=t[n]}function Zn(e,t){let n=Wn[t];n===void 0&&(n=new Int32Array(t),Wn[t]=n);for(let r=0;r!==t;++r)n[r]=e.allocateTextureUnit();return n}function Qn(e,t){let n=this.cache;n[0]!==t&&(e.uniform1f(this.addr,t),n[0]=t)}function $n(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2f(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(Yn(n,t))return;e.uniform2fv(this.addr,t),Xn(n,t)}}function er(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3f(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else if(t.r!==void 0)(n[0]!==t.r||n[1]!==t.g||n[2]!==t.b)&&(e.uniform3f(this.addr,t.r,t.g,t.b),n[0]=t.r,n[1]=t.g,n[2]=t.b);else{if(Yn(n,t))return;e.uniform3fv(this.addr,t),Xn(n,t)}}function tr(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4f(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(Yn(n,t))return;e.uniform4fv(this.addr,t),Xn(n,t)}}function nr(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(Yn(n,t))return;e.uniformMatrix2fv(this.addr,!1,t),Xn(n,t)}else{if(Yn(n,r))return;qn.set(r),e.uniformMatrix2fv(this.addr,!1,qn),Xn(n,r)}}function rr(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(Yn(n,t))return;e.uniformMatrix3fv(this.addr,!1,t),Xn(n,t)}else{if(Yn(n,r))return;Kn.set(r),e.uniformMatrix3fv(this.addr,!1,Kn),Xn(n,r)}}function ir(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(Yn(n,t))return;e.uniformMatrix4fv(this.addr,!1,t),Xn(n,t)}else{if(Yn(n,r))return;Gn.set(r),e.uniformMatrix4fv(this.addr,!1,Gn),Xn(n,r)}}function ar(e,t){let n=this.cache;n[0]!==t&&(e.uniform1i(this.addr,t),n[0]=t)}function or(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2i(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(Yn(n,t))return;e.uniform2iv(this.addr,t),Xn(n,t)}}function sr(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3i(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(Yn(n,t))return;e.uniform3iv(this.addr,t),Xn(n,t)}}function cr(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4i(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(Yn(n,t))return;e.uniform4iv(this.addr,t),Xn(n,t)}}function lr(e,t){let n=this.cache;n[0]!==t&&(e.uniform1ui(this.addr,t),n[0]=t)}function ur(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2ui(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(Yn(n,t))return;e.uniform2uiv(this.addr,t),Xn(n,t)}}function dr(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3ui(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(Yn(n,t))return;e.uniform3uiv(this.addr,t),Xn(n,t)}}function fr(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4ui(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(Yn(n,t))return;e.uniform4uiv(this.addr,t),Xn(n,t)}}function pr(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i);let a;this.type===e.SAMPLER_2D_SHADOW?(zn.compareFunction=n.isReversedDepthBuffer()?518:515,a=zn):a=Rn,n.setTexture2D(t||a,i)}function mr(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTexture3D(t||Vn,i)}function hr(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTextureCube(t||Hn,i)}function gr(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTexture2DArray(t||Bn,i)}function _r(e){switch(e){case 5126:return Qn;case 35664:return $n;case 35665:return er;case 35666:return tr;case 35674:return nr;case 35675:return rr;case 35676:return ir;case 5124:case 35670:return ar;case 35667:case 35671:return or;case 35668:case 35672:return sr;case 35669:case 35673:return cr;case 5125:return lr;case 36294:return ur;case 36295:return dr;case 36296:return fr;case 35678:case 36198:case 36298:case 36306:case 35682:return pr;case 35679:case 36299:case 36307:return mr;case 35680:case 36300:case 36308:case 36293:return hr;case 36289:case 36303:case 36311:case 36292:return gr}}function vr(e,t){e.uniform1fv(this.addr,t)}function yr(e,t){let n=Jn(t,this.size,2);e.uniform2fv(this.addr,n)}function br(e,t){let n=Jn(t,this.size,3);e.uniform3fv(this.addr,n)}function xr(e,t){let n=Jn(t,this.size,4);e.uniform4fv(this.addr,n)}function Sr(e,t){let n=Jn(t,this.size,4);e.uniformMatrix2fv(this.addr,!1,n)}function Cr(e,t){let n=Jn(t,this.size,9);e.uniformMatrix3fv(this.addr,!1,n)}function wr(e,t){let n=Jn(t,this.size,16);e.uniformMatrix4fv(this.addr,!1,n)}function Tr(e,t){e.uniform1iv(this.addr,t)}function Er(e,t){e.uniform2iv(this.addr,t)}function Dr(e,t){e.uniform3iv(this.addr,t)}function Or(e,t){e.uniform4iv(this.addr,t)}function kr(e,t){e.uniform1uiv(this.addr,t)}function Ar(e,t){e.uniform2uiv(this.addr,t)}function jr(e,t){e.uniform3uiv(this.addr,t)}function Mr(e,t){e.uniform4uiv(this.addr,t)}function Nr(e,t,n){let r=this.cache,i=t.length,a=Zn(n,i);Yn(r,a)||(e.uniform1iv(this.addr,a),Xn(r,a));let o;o=this.type===e.SAMPLER_2D_SHADOW?zn:Rn;for(let e=0;e!==i;++e)n.setTexture2D(t[e]||o,a[e])}function Pr(e,t,n){let r=this.cache,i=t.length,a=Zn(n,i);Yn(r,a)||(e.uniform1iv(this.addr,a),Xn(r,a));for(let e=0;e!==i;++e)n.setTexture3D(t[e]||Vn,a[e])}function Fr(e,t,n){let r=this.cache,i=t.length,a=Zn(n,i);Yn(r,a)||(e.uniform1iv(this.addr,a),Xn(r,a));for(let e=0;e!==i;++e)n.setTextureCube(t[e]||Hn,a[e])}function Ir(e,t,n){let r=this.cache,i=t.length,a=Zn(n,i);Yn(r,a)||(e.uniform1iv(this.addr,a),Xn(r,a));for(let e=0;e!==i;++e)n.setTexture2DArray(t[e]||Bn,a[e])}function Lr(e){switch(e){case 5126:return vr;case 35664:return yr;case 35665:return br;case 35666:return xr;case 35674:return Sr;case 35675:return Cr;case 35676:return wr;case 5124:case 35670:return Tr;case 35667:case 35671:return Er;case 35668:case 35672:return Dr;case 35669:case 35673:return Or;case 5125:return kr;case 36294:return Ar;case 36295:return jr;case 36296:return Mr;case 35678:case 36198:case 36298:case 36306:case 35682:return Nr;case 35679:case 36299:case 36307:return Pr;case 35680:case 36300:case 36308:case 36293:return Fr;case 36289:case 36303:case 36311:case 36292:return Ir}}var Rr=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=_r(t.type)}},zr=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=Lr(t.type)}},Br=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){let r=this.seq;for(let i=0,a=r.length;i!==a;++i){let a=r[i];a.setValue(e,t[a.id],n)}}},Vr=/(\w+)(\])?(\[|\.)?/g;function Hr(e,t){e.seq.push(t),e.map[t.id]=t}function Ur(e,t,n){let r=e.name,i=r.length;for(Vr.lastIndex=0;;){let a=Vr.exec(r),o=Vr.lastIndex,s=a[1],c=a[2]===`]`,l=a[3];if(c&&(s|=0),l===void 0||l===`[`&&o+2===i){Hr(n,l===void 0?new Rr(s,e,t):new zr(s,e,t));break}else{let e=n.map[s];e===void 0&&(e=new Br(s),Hr(n,e)),n=e}}}var Wr=class{constructor(e,t){this.seq=[],this.map={};let n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let r=0;r<n;++r){let n=e.getActiveUniform(t,r);Ur(n,e.getUniformLocation(t,n.name),this)}let r=[],i=[];for(let t of this.seq)t.type===e.SAMPLER_2D_SHADOW||t.type===e.SAMPLER_CUBE_SHADOW||t.type===e.SAMPLER_2D_ARRAY_SHADOW?r.push(t):i.push(t);r.length>0&&(this.seq=r.concat(i))}setValue(e,t,n,r){let i=this.map[t];i!==void 0&&i.setValue(e,n,r)}setOptional(e,t,n){let r=t[n];r!==void 0&&this.setValue(e,n,r)}static upload(e,t,n,r){for(let i=0,a=t.length;i!==a;++i){let a=t[i],o=n[a.id];o.needsUpdate!==!1&&a.setValue(e,o.value,r)}}static seqWithValue(e,t){let n=[];for(let r=0,i=e.length;r!==i;++r){let i=e[r];i.id in t&&n.push(i)}return n}};function Gr(e,t,n){let r=e.createShader(t);return e.shaderSource(r,n),e.compileShader(r),r}var Kr=37297,qr=0;function Jr(e,t){let n=e.split(`
`),r=[],i=Math.max(t-6,0),a=Math.min(t+6,n.length);for(let e=i;e<a;e++){let i=e+1;r.push(`${i===t?`>`:` `} ${i}: ${n[e]}`)}return r.join(`
`)}var Yr=new q;function Xr(e){z._getMatrix(Yr,z.workingColorSpace,e);let t=`mat3( ${Yr.elements.map(e=>e.toFixed(4))} )`;switch(z.getTransfer(e)){case st:return[t,`LinearTransferOETF`];case A:return[t,`sRGBTransferOETF`];default:return K(`WebGLProgram: Unsupported color space: `,e),[t,`LinearTransferOETF`]}}function Zr(e,t,n){let r=e.getShaderParameter(t,e.COMPILE_STATUS),i=(e.getShaderInfoLog(t)||``).trim();if(r&&i===``)return``;let a=/ERROR: 0:(\d+)/.exec(i);if(a){let r=parseInt(a[1]);return n.toUpperCase()+`

`+i+`

`+Jr(e.getShaderSource(t),r)}else return i}function Qr(e,t){let n=Xr(t);return[`vec4 ${e}( vec4 value ) {`,`	return ${n[1]}( vec4( value.rgb * ${n[0]}, value.a ) );`,`}`].join(`
`)}var $r={1:`Linear`,2:`Reinhard`,3:`Cineon`,4:`ACESFilmic`,6:`AgX`,7:`Neutral`,5:`Custom`};function ei(e,t){let n=$r[t];return n===void 0?(K(`WebGLProgram: Unsupported toneMapping:`,t),`vec3 `+e+`( vec3 color ) { return LinearToneMapping( color ); }`):`vec3 `+e+`( vec3 color ) { return `+n+`ToneMapping( color ); }`}var ti=new I;function ni(){return z.getLuminanceCoefficients(ti),[`float luminance( const in vec3 rgb ) {`,`	const vec3 weights = vec3( ${ti.x.toFixed(4)}, ${ti.y.toFixed(4)}, ${ti.z.toFixed(4)} );`,`	return dot( weights, rgb );`,`}`].join(`
`)}function ri(e){return[e.extensionClipCullDistance?`#extension GL_ANGLE_clip_cull_distance : require`:``,e.extensionMultiDraw?`#extension GL_ANGLE_multi_draw : require`:``].filter(oi).join(`
`)}function ii(e){let t=[];for(let n in e){let r=e[n];r!==!1&&t.push(`#define `+n+` `+r)}return t.join(`
`)}function ai(e,t){let n={},r=e.getProgramParameter(t,e.ACTIVE_ATTRIBUTES);for(let i=0;i<r;i++){let r=e.getActiveAttrib(t,i),a=r.name,o=1;r.type===e.FLOAT_MAT2&&(o=2),r.type===e.FLOAT_MAT3&&(o=3),r.type===e.FLOAT_MAT4&&(o=4),n[a]={type:r.type,location:e.getAttribLocation(t,a),locationSize:o}}return n}function oi(e){return e!==``}function si(e,t){let n=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return e.replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,n).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function ci(e,t){return e.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}var li=/^[ \t]*#include +<([\w\d./]+)>/gm;function ui(e){return e.replace(li,fi)}var di=new Map;function fi(e,t){let n=X[t];if(n===void 0){let e=di.get(t);if(e!==void 0)n=X[e],K(`WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.`,t,e);else throw Error(`THREE.WebGLProgram: Can not resolve #include <`+t+`>`)}return ui(n)}var pi=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function mi(e){return e.replace(pi,hi)}function hi(e,t,n,r){let i=``;for(let e=parseInt(t);e<parseInt(n);e++)i+=r.replace(/\[\s*i\s*\]/g,`[ `+e+` ]`).replace(/UNROLLED_LOOP_INDEX/g,e);return i}function gi(e){let t=`precision ${e.precision} float;
	precision ${e.precision} int;
	precision ${e.precision} sampler2D;
	precision ${e.precision} samplerCube;
	precision ${e.precision} sampler3D;
	precision ${e.precision} sampler2DArray;
	precision ${e.precision} sampler2DShadow;
	precision ${e.precision} samplerCubeShadow;
	precision ${e.precision} sampler2DArrayShadow;
	precision ${e.precision} isampler2D;
	precision ${e.precision} isampler3D;
	precision ${e.precision} isamplerCube;
	precision ${e.precision} isampler2DArray;
	precision ${e.precision} usampler2D;
	precision ${e.precision} usampler3D;
	precision ${e.precision} usamplerCube;
	precision ${e.precision} usampler2DArray;
	`;return e.precision===`highp`?t+=`
#define HIGH_PRECISION`:e.precision===`mediump`?t+=`
#define MEDIUM_PRECISION`:e.precision===`lowp`&&(t+=`
#define LOW_PRECISION`),t}var _i={1:`SHADOWMAP_TYPE_PCF`,3:`SHADOWMAP_TYPE_VSM`};function vi(e){return _i[e.shadowMapType]||`SHADOWMAP_TYPE_BASIC`}var yi={301:`ENVMAP_TYPE_CUBE`,302:`ENVMAP_TYPE_CUBE`,306:`ENVMAP_TYPE_CUBE_UV`};function bi(e){return e.envMap===!1?`ENVMAP_TYPE_CUBE`:yi[e.envMapMode]||`ENVMAP_TYPE_CUBE`}var xi={302:`ENVMAP_MODE_REFRACTION`};function Si(e){return e.envMap===!1?`ENVMAP_MODE_REFLECTION`:xi[e.envMapMode]||`ENVMAP_MODE_REFLECTION`}var Ci={0:`ENVMAP_BLENDING_MULTIPLY`,1:`ENVMAP_BLENDING_MIX`,2:`ENVMAP_BLENDING_ADD`};function wi(e){return e.envMap===!1?`ENVMAP_BLENDING_NONE`:Ci[e.combine]||`ENVMAP_BLENDING_NONE`}function Ti(e){let t=e.envMapCubeUVHeight;if(t===null)return null;let n=Math.log2(t)-2,r=1/t;return{texelWidth:1/(3*Math.max(2**n,112)),texelHeight:r,maxMip:n}}function Ei(e,t,n,r){let i=e.getContext(),a=n.defines,o=n.vertexShader,s=n.fragmentShader,c=vi(n),l=bi(n),u=Si(n),d=wi(n),f=Ti(n),p=ri(n),m=ii(a),h=i.createProgram(),g,_,v=n.glslVersion?`#version `+n.glslVersion+`
`:``;n.isRawShaderMaterial?(g=[`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m].filter(oi).join(`
`),g.length>0&&(g+=`
`),_=[`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m].filter(oi).join(`
`),_.length>0&&(_+=`
`)):(g=[gi(n),`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m,n.extensionClipCullDistance?`#define USE_CLIP_DISTANCE`:``,n.batching?`#define USE_BATCHING`:``,n.batchingColor?`#define USE_BATCHING_COLOR`:``,n.instancing?`#define USE_INSTANCING`:``,n.instancingColor?`#define USE_INSTANCING_COLOR`:``,n.instancingMorph?`#define USE_INSTANCING_MORPH`:``,n.useFog&&n.fog?`#define USE_FOG`:``,n.useFog&&n.fogExp2?`#define FOG_EXP2`:``,n.map?`#define USE_MAP`:``,n.envMap?`#define USE_ENVMAP`:``,n.envMap?`#define `+u:``,n.lightMap?`#define USE_LIGHTMAP`:``,n.aoMap?`#define USE_AOMAP`:``,n.bumpMap?`#define USE_BUMPMAP`:``,n.normalMap?`#define USE_NORMALMAP`:``,n.normalMapObjectSpace?`#define USE_NORMALMAP_OBJECTSPACE`:``,n.normalMapTangentSpace?`#define USE_NORMALMAP_TANGENTSPACE`:``,n.displacementMap?`#define USE_DISPLACEMENTMAP`:``,n.emissiveMap?`#define USE_EMISSIVEMAP`:``,n.anisotropy?`#define USE_ANISOTROPY`:``,n.anisotropyMap?`#define USE_ANISOTROPYMAP`:``,n.clearcoatMap?`#define USE_CLEARCOATMAP`:``,n.clearcoatRoughnessMap?`#define USE_CLEARCOAT_ROUGHNESSMAP`:``,n.clearcoatNormalMap?`#define USE_CLEARCOAT_NORMALMAP`:``,n.iridescenceMap?`#define USE_IRIDESCENCEMAP`:``,n.iridescenceThicknessMap?`#define USE_IRIDESCENCE_THICKNESSMAP`:``,n.specularMap?`#define USE_SPECULARMAP`:``,n.specularColorMap?`#define USE_SPECULAR_COLORMAP`:``,n.specularIntensityMap?`#define USE_SPECULAR_INTENSITYMAP`:``,n.roughnessMap?`#define USE_ROUGHNESSMAP`:``,n.metalnessMap?`#define USE_METALNESSMAP`:``,n.alphaMap?`#define USE_ALPHAMAP`:``,n.alphaHash?`#define USE_ALPHAHASH`:``,n.transmission?`#define USE_TRANSMISSION`:``,n.transmissionMap?`#define USE_TRANSMISSIONMAP`:``,n.thicknessMap?`#define USE_THICKNESSMAP`:``,n.sheenColorMap?`#define USE_SHEEN_COLORMAP`:``,n.sheenRoughnessMap?`#define USE_SHEEN_ROUGHNESSMAP`:``,n.mapUv?`#define MAP_UV `+n.mapUv:``,n.alphaMapUv?`#define ALPHAMAP_UV `+n.alphaMapUv:``,n.lightMapUv?`#define LIGHTMAP_UV `+n.lightMapUv:``,n.aoMapUv?`#define AOMAP_UV `+n.aoMapUv:``,n.emissiveMapUv?`#define EMISSIVEMAP_UV `+n.emissiveMapUv:``,n.bumpMapUv?`#define BUMPMAP_UV `+n.bumpMapUv:``,n.normalMapUv?`#define NORMALMAP_UV `+n.normalMapUv:``,n.displacementMapUv?`#define DISPLACEMENTMAP_UV `+n.displacementMapUv:``,n.metalnessMapUv?`#define METALNESSMAP_UV `+n.metalnessMapUv:``,n.roughnessMapUv?`#define ROUGHNESSMAP_UV `+n.roughnessMapUv:``,n.anisotropyMapUv?`#define ANISOTROPYMAP_UV `+n.anisotropyMapUv:``,n.clearcoatMapUv?`#define CLEARCOATMAP_UV `+n.clearcoatMapUv:``,n.clearcoatNormalMapUv?`#define CLEARCOAT_NORMALMAP_UV `+n.clearcoatNormalMapUv:``,n.clearcoatRoughnessMapUv?`#define CLEARCOAT_ROUGHNESSMAP_UV `+n.clearcoatRoughnessMapUv:``,n.iridescenceMapUv?`#define IRIDESCENCEMAP_UV `+n.iridescenceMapUv:``,n.iridescenceThicknessMapUv?`#define IRIDESCENCE_THICKNESSMAP_UV `+n.iridescenceThicknessMapUv:``,n.sheenColorMapUv?`#define SHEEN_COLORMAP_UV `+n.sheenColorMapUv:``,n.sheenRoughnessMapUv?`#define SHEEN_ROUGHNESSMAP_UV `+n.sheenRoughnessMapUv:``,n.specularMapUv?`#define SPECULARMAP_UV `+n.specularMapUv:``,n.specularColorMapUv?`#define SPECULAR_COLORMAP_UV `+n.specularColorMapUv:``,n.specularIntensityMapUv?`#define SPECULAR_INTENSITYMAP_UV `+n.specularIntensityMapUv:``,n.transmissionMapUv?`#define TRANSMISSIONMAP_UV `+n.transmissionMapUv:``,n.thicknessMapUv?`#define THICKNESSMAP_UV `+n.thicknessMapUv:``,n.vertexTangents&&n.flatShading===!1?`#define USE_TANGENT`:``,n.vertexNormals?`#define HAS_NORMAL`:``,n.vertexColors?`#define USE_COLOR`:``,n.vertexAlphas?`#define USE_COLOR_ALPHA`:``,n.vertexUv1s?`#define USE_UV1`:``,n.vertexUv2s?`#define USE_UV2`:``,n.vertexUv3s?`#define USE_UV3`:``,n.pointsUvs?`#define USE_POINTS_UV`:``,n.flatShading?`#define FLAT_SHADED`:``,n.skinning?`#define USE_SKINNING`:``,n.morphTargets?`#define USE_MORPHTARGETS`:``,n.morphNormals&&n.flatShading===!1?`#define USE_MORPHNORMALS`:``,n.morphColors?`#define USE_MORPHCOLORS`:``,n.morphTargetsCount>0?`#define MORPHTARGETS_TEXTURE_STRIDE `+n.morphTextureStride:``,n.morphTargetsCount>0?`#define MORPHTARGETS_COUNT `+n.morphTargetsCount:``,n.doubleSided?`#define DOUBLE_SIDED`:``,n.flipSided?`#define FLIP_SIDED`:``,n.shadowMapEnabled?`#define USE_SHADOWMAP`:``,n.shadowMapEnabled?`#define `+c:``,n.sizeAttenuation?`#define USE_SIZEATTENUATION`:``,n.numLightProbes>0?`#define USE_LIGHT_PROBES`:``,n.logarithmicDepthBuffer?`#define USE_LOGARITHMIC_DEPTH_BUFFER`:``,n.reversedDepthBuffer?`#define USE_REVERSED_DEPTH_BUFFER`:``,`uniform mat4 modelMatrix;`,`uniform mat4 modelViewMatrix;`,`uniform mat4 projectionMatrix;`,`uniform mat4 viewMatrix;`,`uniform mat3 normalMatrix;`,`uniform vec3 cameraPosition;`,`uniform bool isOrthographic;`,`#ifdef USE_INSTANCING`,`	attribute mat4 instanceMatrix;`,`#endif`,`#ifdef USE_INSTANCING_COLOR`,`	attribute vec3 instanceColor;`,`#endif`,`#ifdef USE_INSTANCING_MORPH`,`	uniform sampler2D morphTexture;`,`#endif`,`attribute vec3 position;`,`attribute vec3 normal;`,`attribute vec2 uv;`,`#ifdef USE_UV1`,`	attribute vec2 uv1;`,`#endif`,`#ifdef USE_UV2`,`	attribute vec2 uv2;`,`#endif`,`#ifdef USE_UV3`,`	attribute vec2 uv3;`,`#endif`,`#ifdef USE_TANGENT`,`	attribute vec4 tangent;`,`#endif`,`#if defined( USE_COLOR_ALPHA )`,`	attribute vec4 color;`,`#elif defined( USE_COLOR )`,`	attribute vec3 color;`,`#endif`,`#ifdef USE_SKINNING`,`	attribute vec4 skinIndex;`,`	attribute vec4 skinWeight;`,`#endif`,`
`].filter(oi).join(`
`),_=[gi(n),`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m,n.useFog&&n.fog?`#define USE_FOG`:``,n.useFog&&n.fogExp2?`#define FOG_EXP2`:``,n.alphaToCoverage?`#define ALPHA_TO_COVERAGE`:``,n.map?`#define USE_MAP`:``,n.matcap?`#define USE_MATCAP`:``,n.envMap?`#define USE_ENVMAP`:``,n.envMap?`#define `+l:``,n.envMap?`#define `+u:``,n.envMap?`#define `+d:``,f?`#define CUBEUV_TEXEL_WIDTH `+f.texelWidth:``,f?`#define CUBEUV_TEXEL_HEIGHT `+f.texelHeight:``,f?`#define CUBEUV_MAX_MIP `+f.maxMip+`.0`:``,n.lightMap?`#define USE_LIGHTMAP`:``,n.aoMap?`#define USE_AOMAP`:``,n.bumpMap?`#define USE_BUMPMAP`:``,n.normalMap?`#define USE_NORMALMAP`:``,n.normalMapObjectSpace?`#define USE_NORMALMAP_OBJECTSPACE`:``,n.normalMapTangentSpace?`#define USE_NORMALMAP_TANGENTSPACE`:``,n.packedNormalMap?`#define USE_PACKED_NORMALMAP`:``,n.emissiveMap?`#define USE_EMISSIVEMAP`:``,n.anisotropy?`#define USE_ANISOTROPY`:``,n.anisotropyMap?`#define USE_ANISOTROPYMAP`:``,n.clearcoat?`#define USE_CLEARCOAT`:``,n.clearcoatMap?`#define USE_CLEARCOATMAP`:``,n.clearcoatRoughnessMap?`#define USE_CLEARCOAT_ROUGHNESSMAP`:``,n.clearcoatNormalMap?`#define USE_CLEARCOAT_NORMALMAP`:``,n.dispersion?`#define USE_DISPERSION`:``,n.iridescence?`#define USE_IRIDESCENCE`:``,n.iridescenceMap?`#define USE_IRIDESCENCEMAP`:``,n.iridescenceThicknessMap?`#define USE_IRIDESCENCE_THICKNESSMAP`:``,n.specularMap?`#define USE_SPECULARMAP`:``,n.specularColorMap?`#define USE_SPECULAR_COLORMAP`:``,n.specularIntensityMap?`#define USE_SPECULAR_INTENSITYMAP`:``,n.roughnessMap?`#define USE_ROUGHNESSMAP`:``,n.metalnessMap?`#define USE_METALNESSMAP`:``,n.alphaMap?`#define USE_ALPHAMAP`:``,n.alphaTest?`#define USE_ALPHATEST`:``,n.alphaHash?`#define USE_ALPHAHASH`:``,n.sheen?`#define USE_SHEEN`:``,n.sheenColorMap?`#define USE_SHEEN_COLORMAP`:``,n.sheenRoughnessMap?`#define USE_SHEEN_ROUGHNESSMAP`:``,n.transmission?`#define USE_TRANSMISSION`:``,n.transmissionMap?`#define USE_TRANSMISSIONMAP`:``,n.thicknessMap?`#define USE_THICKNESSMAP`:``,n.vertexTangents&&n.flatShading===!1?`#define USE_TANGENT`:``,n.vertexColors||n.instancingColor?`#define USE_COLOR`:``,n.vertexAlphas||n.batchingColor?`#define USE_COLOR_ALPHA`:``,n.vertexUv1s?`#define USE_UV1`:``,n.vertexUv2s?`#define USE_UV2`:``,n.vertexUv3s?`#define USE_UV3`:``,n.pointsUvs?`#define USE_POINTS_UV`:``,n.gradientMap?`#define USE_GRADIENTMAP`:``,n.flatShading?`#define FLAT_SHADED`:``,n.doubleSided?`#define DOUBLE_SIDED`:``,n.flipSided?`#define FLIP_SIDED`:``,n.shadowMapEnabled?`#define USE_SHADOWMAP`:``,n.shadowMapEnabled?`#define `+c:``,n.premultipliedAlpha?`#define PREMULTIPLIED_ALPHA`:``,n.numLightProbes>0?`#define USE_LIGHT_PROBES`:``,n.numLightProbeGrids>0?`#define USE_LIGHT_PROBES_GRID`:``,n.decodeVideoTexture?`#define DECODE_VIDEO_TEXTURE`:``,n.decodeVideoTextureEmissive?`#define DECODE_VIDEO_TEXTURE_EMISSIVE`:``,n.logarithmicDepthBuffer?`#define USE_LOGARITHMIC_DEPTH_BUFFER`:``,n.reversedDepthBuffer?`#define USE_REVERSED_DEPTH_BUFFER`:``,`uniform mat4 viewMatrix;`,`uniform vec3 cameraPosition;`,`uniform bool isOrthographic;`,n.toneMapping===0?``:`#define TONE_MAPPING`,n.toneMapping===0?``:X.tonemapping_pars_fragment,n.toneMapping===0?``:ei(`toneMapping`,n.toneMapping),n.dithering?`#define DITHERING`:``,n.opaque?`#define OPAQUE`:``,X.colorspace_pars_fragment,Qr(`linearToOutputTexel`,n.outputColorSpace),ni(),n.useDepthPacking?`#define DEPTH_PACKING `+n.depthPacking:``,`
`].filter(oi).join(`
`)),o=ui(o),o=si(o,n),o=ci(o,n),s=ui(s),s=si(s,n),s=ci(s,n),o=mi(o),s=mi(s),n.isRawShaderMaterial!==!0&&(v=`#version 300 es
`,g=[p,`#define attribute in`,`#define varying out`,`#define texture2D texture`].join(`
`)+`
`+g,_=[`#define varying in`,n.glslVersion===`300 es`?``:`layout(location = 0) out highp vec4 pc_fragColor;`,n.glslVersion===`300 es`?``:`#define gl_FragColor pc_fragColor`,`#define gl_FragDepthEXT gl_FragDepth`,`#define texture2D texture`,`#define textureCube texture`,`#define texture2DProj textureProj`,`#define texture2DLodEXT textureLod`,`#define texture2DProjLodEXT textureProjLod`,`#define textureCubeLodEXT textureLod`,`#define texture2DGradEXT textureGrad`,`#define texture2DProjGradEXT textureProjGrad`,`#define textureCubeGradEXT textureGrad`].join(`
`)+`
`+_);let y=v+g+o,b=v+_+s,x=Gr(i,i.VERTEX_SHADER,y),S=Gr(i,i.FRAGMENT_SHADER,b);i.attachShader(h,x),i.attachShader(h,S),n.index0AttributeName===void 0?n.hasPositionAttribute===!0&&i.bindAttribLocation(h,0,`position`):i.bindAttribLocation(h,0,n.index0AttributeName),i.linkProgram(h);function C(t){if(e.debug.checkShaderErrors){let n=i.getProgramInfoLog(h)||``,r=i.getShaderInfoLog(x)||``,a=i.getShaderInfoLog(S)||``,o=n.trim(),s=r.trim(),c=a.trim(),l=!0,u=!0;if(i.getProgramParameter(h,i.LINK_STATUS)===!1)if(l=!1,typeof e.debug.onShaderError==`function`)e.debug.onShaderError(i,h,x,S);else{let e=Zr(i,x,`vertex`),n=Zr(i,S,`fragment`);ft(`WebGLProgram: Shader Error `+i.getError()+` - VALIDATE_STATUS `+i.getProgramParameter(h,i.VALIDATE_STATUS)+`

Material Name: `+t.name+`
Material Type: `+t.type+`

Program Info Log: `+o+`
`+e+`
`+n)}else o===``?(s===``||c===``)&&(u=!1):K(`WebGLProgram: Program Info Log:`,o);u&&(t.diagnostics={runnable:l,programLog:o,vertexShader:{log:s,prefix:g},fragmentShader:{log:c,prefix:_}})}i.deleteShader(x),i.deleteShader(S),w=new Wr(i,h),T=ai(i,h)}let w;this.getUniforms=function(){return w===void 0&&C(this),w};let T;this.getAttributes=function(){return T===void 0&&C(this),T};let E=n.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return E===!1&&(E=i.getProgramParameter(h,Kr)),E},this.destroy=function(){r.releaseStatesOfProgram(this),i.deleteProgram(h),this.program=void 0},this.type=n.shaderType,this.name=n.shaderName,this.id=qr++,this.cacheKey=t,this.usedTimes=1,this.program=h,this.vertexShader=x,this.fragmentShader=S,this}var Di=0,Oi=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,n){let r=this._getShaderCacheForMaterial(e);return r.has(t)===!1&&(r.add(t),t.usedTimes++),r.has(n)===!1&&(r.add(n),n.usedTimes++),this}remove(e){let t=this.materialCache.get(e);for(let e of t)e.usedTimes--,e.usedTimes===0&&this.shaderCache.delete(e.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let t=this.materialCache,n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){let t=this.shaderCache,n=t.get(e);return n===void 0&&(n=new ki(e),t.set(e,n)),n}},ki=class{constructor(e){this.id=Di++,this.code=e,this.usedTimes=0}};function Ai(e){return e===1030||e===37490||e===36285}function ji(e,t,n,r,i,a){let o=new Et,s=new Oi,c=new Set,l=[],u=new Map,d=r.logarithmicDepthBuffer,f=r.precision,p={MeshDepthMaterial:`depth`,MeshDistanceMaterial:`distance`,MeshNormalMaterial:`normal`,MeshBasicMaterial:`basic`,MeshLambertMaterial:`lambert`,MeshPhongMaterial:`phong`,MeshToonMaterial:`toon`,MeshStandardMaterial:`physical`,MeshPhysicalMaterial:`physical`,MeshMatcapMaterial:`matcap`,LineBasicMaterial:`basic`,LineDashedMaterial:`dashed`,PointsMaterial:`points`,ShadowMaterial:`shadow`,SpriteMaterial:`sprite`};function m(e){return c.add(e),e===0?`uv`:`uv${e}`}function h(i,o,l,u,h,g){let _=u.fog,v=h.geometry,y=i.isMeshStandardMaterial||i.isMeshLambertMaterial||i.isMeshPhongMaterial?u.environment:null,b=i.isMeshStandardMaterial||i.isMeshLambertMaterial&&!i.envMap||i.isMeshPhongMaterial&&!i.envMap,x=t.get(i.envMap||y,b),S=x&&x.mapping===306?x.image.height:null,C=p[i.type];i.precision!==null&&(f=r.getMaxPrecision(i.precision),f!==i.precision&&K(`WebGLProgram.getParameters:`,i.precision,`not supported, using`,f,`instead.`));let w=v.morphAttributes.position||v.morphAttributes.normal||v.morphAttributes.color,T=w===void 0?0:w.length,E=0;v.morphAttributes.position!==void 0&&(E=1),v.morphAttributes.normal!==void 0&&(E=2),v.morphAttributes.color!==void 0&&(E=3);let D,O,k,A;if(C){let e=Qt[C];D=e.vertexShader,O=e.fragmentShader}else{D=i.vertexShader,O=i.fragmentShader;let e=s.getVertexShaderStage(i),t=s.getFragmentShaderStage(i);s.update(i,e,t),k=e.id,A=t.id}let j=e.getRenderTarget(),ee=e.state.buffers.depth.getReversed(),te=h.isInstancedMesh===!0,ne=h.isBatchedMesh===!0,M=!!i.map,re=!!i.matcap,N=!!x,ie=!!i.aoMap,P=!!i.lightMap,F=!!i.bumpMap&&i.wireframe===!1,ae=!!i.normalMap,oe=!!i.displacementMap,I=!!i.emissiveMap,se=!!i.metalnessMap,ce=!!i.roughnessMap,le=i.anisotropy>0,ue=i.clearcoat>0,de=i.dispersion>0,fe=i.iridescence>0,L=i.sheen>0,pe=i.transmission>0,R=le&&!!i.anisotropyMap,me=ue&&!!i.clearcoatMap,he=ue&&!!i.clearcoatNormalMap,ge=ue&&!!i.clearcoatRoughnessMap,_e=fe&&!!i.iridescenceMap,ve=fe&&!!i.iridescenceThicknessMap,ye=L&&!!i.sheenColorMap,be=L&&!!i.sheenRoughnessMap,xe=!!i.specularMap,Se=!!i.specularColorMap,Ce=!!i.specularIntensityMap,we=pe&&!!i.transmissionMap,Te=pe&&!!i.thicknessMap,B=!!i.gradientMap,Ee=!!i.alphaMap,De=i.alphaTest>0,Oe=!!i.alphaHash,ke=!!i.extensions,Ae=0;i.toneMapped&&(j===null||j.isXRRenderTarget===!0)&&(Ae=e.toneMapping);let V={shaderID:C,shaderType:i.type,shaderName:i.name,vertexShader:D,fragmentShader:O,defines:i.defines,customVertexShaderID:k,customFragmentShaderID:A,isRawShaderMaterial:i.isRawShaderMaterial===!0,glslVersion:i.glslVersion,precision:f,batching:ne,batchingColor:ne&&h._colorsTexture!==null,instancing:te,instancingColor:te&&h.instanceColor!==null,instancingMorph:te&&h.morphTexture!==null,outputColorSpace:j===null?e.outputColorSpace:j.isXRRenderTarget===!0?j.texture.colorSpace:z.workingColorSpace,alphaToCoverage:!!i.alphaToCoverage,map:M,matcap:re,envMap:N,envMapMode:N&&x.mapping,envMapCubeUVHeight:S,aoMap:ie,lightMap:P,bumpMap:F,normalMap:ae,displacementMap:oe,emissiveMap:I,normalMapObjectSpace:ae&&i.normalMapType===1,normalMapTangentSpace:ae&&i.normalMapType===0,packedNormalMap:ae&&i.normalMapType===0&&Ai(i.normalMap.format),metalnessMap:se,roughnessMap:ce,anisotropy:le,anisotropyMap:R,clearcoat:ue,clearcoatMap:me,clearcoatNormalMap:he,clearcoatRoughnessMap:ge,dispersion:de,iridescence:fe,iridescenceMap:_e,iridescenceThicknessMap:ve,sheen:L,sheenColorMap:ye,sheenRoughnessMap:be,specularMap:xe,specularColorMap:Se,specularIntensityMap:Ce,transmission:pe,transmissionMap:we,thicknessMap:Te,gradientMap:B,opaque:i.transparent===!1&&i.blending===1&&i.alphaToCoverage===!1,alphaMap:Ee,alphaTest:De,alphaHash:Oe,combine:i.combine,mapUv:M&&m(i.map.channel),aoMapUv:ie&&m(i.aoMap.channel),lightMapUv:P&&m(i.lightMap.channel),bumpMapUv:F&&m(i.bumpMap.channel),normalMapUv:ae&&m(i.normalMap.channel),displacementMapUv:oe&&m(i.displacementMap.channel),emissiveMapUv:I&&m(i.emissiveMap.channel),metalnessMapUv:se&&m(i.metalnessMap.channel),roughnessMapUv:ce&&m(i.roughnessMap.channel),anisotropyMapUv:R&&m(i.anisotropyMap.channel),clearcoatMapUv:me&&m(i.clearcoatMap.channel),clearcoatNormalMapUv:he&&m(i.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:ge&&m(i.clearcoatRoughnessMap.channel),iridescenceMapUv:_e&&m(i.iridescenceMap.channel),iridescenceThicknessMapUv:ve&&m(i.iridescenceThicknessMap.channel),sheenColorMapUv:ye&&m(i.sheenColorMap.channel),sheenRoughnessMapUv:be&&m(i.sheenRoughnessMap.channel),specularMapUv:xe&&m(i.specularMap.channel),specularColorMapUv:Se&&m(i.specularColorMap.channel),specularIntensityMapUv:Ce&&m(i.specularIntensityMap.channel),transmissionMapUv:we&&m(i.transmissionMap.channel),thicknessMapUv:Te&&m(i.thicknessMap.channel),alphaMapUv:Ee&&m(i.alphaMap.channel),vertexTangents:!!v.attributes.tangent&&(ae||le),vertexNormals:!!v.attributes.normal,vertexColors:i.vertexColors,vertexAlphas:i.vertexColors===!0&&!!v.attributes.color&&v.attributes.color.itemSize===4,pointsUvs:h.isPoints===!0&&!!v.attributes.uv&&(M||Ee),fog:!!_,useFog:i.fog===!0,fogExp2:!!_&&_.isFogExp2,flatShading:i.wireframe===!1&&(i.flatShading===!0||v.attributes.normal===void 0&&ae===!1&&(i.isMeshLambertMaterial||i.isMeshPhongMaterial||i.isMeshStandardMaterial||i.isMeshPhysicalMaterial)),sizeAttenuation:i.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:ee,skinning:h.isSkinnedMesh===!0,hasPositionAttribute:v.attributes.position!==void 0,morphTargets:v.morphAttributes.position!==void 0,morphNormals:v.morphAttributes.normal!==void 0,morphColors:v.morphAttributes.color!==void 0,morphTargetsCount:T,morphTextureStride:E,numDirLights:o.directional.length,numPointLights:o.point.length,numSpotLights:o.spot.length,numSpotLightMaps:o.spotLightMap.length,numRectAreaLights:o.rectArea.length,numHemiLights:o.hemi.length,numDirLightShadows:o.directionalShadowMap.length,numPointLightShadows:o.pointShadowMap.length,numSpotLightShadows:o.spotShadowMap.length,numSpotLightShadowsWithMaps:o.numSpotLightShadowsWithMaps,numLightProbes:o.numLightProbes,numLightProbeGrids:g.length,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:i.dithering,shadowMapEnabled:e.shadowMap.enabled&&l.length>0,shadowMapType:e.shadowMap.type,toneMapping:Ae,decodeVideoTexture:M&&i.map.isVideoTexture===!0&&z.getTransfer(i.map.colorSpace)===`srgb`,decodeVideoTextureEmissive:I&&i.emissiveMap.isVideoTexture===!0&&z.getTransfer(i.emissiveMap.colorSpace)===`srgb`,premultipliedAlpha:i.premultipliedAlpha,doubleSided:i.side===2,flipSided:i.side===1,useDepthPacking:i.depthPacking>=0,depthPacking:i.depthPacking||0,index0AttributeName:i.index0AttributeName,extensionClipCullDistance:ke&&i.extensions.clipCullDistance===!0&&n.has(`WEBGL_clip_cull_distance`),extensionMultiDraw:(ke&&i.extensions.multiDraw===!0||ne)&&n.has(`WEBGL_multi_draw`),rendererExtensionParallelShaderCompile:n.has(`KHR_parallel_shader_compile`),customProgramCacheKey:i.customProgramCacheKey()};return V.vertexUv1s=c.has(1),V.vertexUv2s=c.has(2),V.vertexUv3s=c.has(3),c.clear(),V}function g(t){let n=[];if(t.shaderID?n.push(t.shaderID):(n.push(t.customVertexShaderID),n.push(t.customFragmentShaderID)),t.defines!==void 0)for(let e in t.defines)n.push(e),n.push(t.defines[e]);return t.isRawShaderMaterial===!1&&(_(n,t),v(n,t),n.push(e.outputColorSpace)),n.push(t.customProgramCacheKey),n.join()}function _(e,t){e.push(t.precision),e.push(t.outputColorSpace),e.push(t.envMapMode),e.push(t.envMapCubeUVHeight),e.push(t.mapUv),e.push(t.alphaMapUv),e.push(t.lightMapUv),e.push(t.aoMapUv),e.push(t.bumpMapUv),e.push(t.normalMapUv),e.push(t.displacementMapUv),e.push(t.emissiveMapUv),e.push(t.metalnessMapUv),e.push(t.roughnessMapUv),e.push(t.anisotropyMapUv),e.push(t.clearcoatMapUv),e.push(t.clearcoatNormalMapUv),e.push(t.clearcoatRoughnessMapUv),e.push(t.iridescenceMapUv),e.push(t.iridescenceThicknessMapUv),e.push(t.sheenColorMapUv),e.push(t.sheenRoughnessMapUv),e.push(t.specularMapUv),e.push(t.specularColorMapUv),e.push(t.specularIntensityMapUv),e.push(t.transmissionMapUv),e.push(t.thicknessMapUv),e.push(t.combine),e.push(t.fogExp2),e.push(t.sizeAttenuation),e.push(t.morphTargetsCount),e.push(t.morphAttributeCount),e.push(t.numDirLights),e.push(t.numPointLights),e.push(t.numSpotLights),e.push(t.numSpotLightMaps),e.push(t.numHemiLights),e.push(t.numRectAreaLights),e.push(t.numDirLightShadows),e.push(t.numPointLightShadows),e.push(t.numSpotLightShadows),e.push(t.numSpotLightShadowsWithMaps),e.push(t.numLightProbes),e.push(t.shadowMapType),e.push(t.toneMapping),e.push(t.numClippingPlanes),e.push(t.numClipIntersection),e.push(t.depthPacking)}function v(e,t){o.disableAll(),t.instancing&&o.enable(0),t.instancingColor&&o.enable(1),t.instancingMorph&&o.enable(2),t.matcap&&o.enable(3),t.envMap&&o.enable(4),t.normalMapObjectSpace&&o.enable(5),t.normalMapTangentSpace&&o.enable(6),t.clearcoat&&o.enable(7),t.iridescence&&o.enable(8),t.alphaTest&&o.enable(9),t.vertexColors&&o.enable(10),t.vertexAlphas&&o.enable(11),t.vertexUv1s&&o.enable(12),t.vertexUv2s&&o.enable(13),t.vertexUv3s&&o.enable(14),t.vertexTangents&&o.enable(15),t.anisotropy&&o.enable(16),t.alphaHash&&o.enable(17),t.batching&&o.enable(18),t.dispersion&&o.enable(19),t.batchingColor&&o.enable(20),t.gradientMap&&o.enable(21),t.packedNormalMap&&o.enable(22),t.vertexNormals&&o.enable(23),e.push(o.mask),o.disableAll(),t.fog&&o.enable(0),t.useFog&&o.enable(1),t.flatShading&&o.enable(2),t.logarithmicDepthBuffer&&o.enable(3),t.reversedDepthBuffer&&o.enable(4),t.skinning&&o.enable(5),t.morphTargets&&o.enable(6),t.morphNormals&&o.enable(7),t.morphColors&&o.enable(8),t.premultipliedAlpha&&o.enable(9),t.shadowMapEnabled&&o.enable(10),t.doubleSided&&o.enable(11),t.flipSided&&o.enable(12),t.useDepthPacking&&o.enable(13),t.dithering&&o.enable(14),t.transmission&&o.enable(15),t.sheen&&o.enable(16),t.opaque&&o.enable(17),t.pointsUvs&&o.enable(18),t.decodeVideoTexture&&o.enable(19),t.decodeVideoTextureEmissive&&o.enable(20),t.alphaToCoverage&&o.enable(21),t.numLightProbeGrids>0&&o.enable(22),t.hasPositionAttribute&&o.enable(23),e.push(o.mask)}function y(e){let t=p[e.type],n;if(t){let e=Qt[t];n=xe.clone(e.uniforms)}else n=e.uniforms;return n}function b(t,n){let r=u.get(n);return r===void 0?(r=new Ei(e,n,t,i),l.push(r),u.set(n,r)):++r.usedTimes,r}function x(e){if(--e.usedTimes===0){let t=l.indexOf(e);l[t]=l[l.length-1],l.pop(),u.delete(e.cacheKey),e.destroy()}}function S(e){s.remove(e)}function C(){s.dispose()}return{getParameters:h,getProgramCacheKey:g,getUniforms:y,acquireProgram:b,releaseProgram:x,releaseShaderCache:S,programs:l,dispose:C}}function Mi(){let e=new WeakMap;function t(t){return e.has(t)}function n(t){let n=e.get(t);return n===void 0&&(n={},e.set(t,n)),n}function r(t){e.delete(t)}function i(t,n,r){e.get(t)[n]=r}function a(){e=new WeakMap}return{has:t,get:n,remove:r,update:i,dispose:a}}function Ni(e,t){return e.groupOrder===t.groupOrder?e.renderOrder===t.renderOrder?e.material.id===t.material.id?e.materialVariant===t.materialVariant?e.z===t.z?e.id-t.id:e.z-t.z:e.materialVariant-t.materialVariant:e.material.id-t.material.id:e.renderOrder-t.renderOrder:e.groupOrder-t.groupOrder}function Pi(e,t){return e.groupOrder===t.groupOrder?e.renderOrder===t.renderOrder?e.z===t.z?e.id-t.id:t.z-e.z:e.renderOrder-t.renderOrder:e.groupOrder-t.groupOrder}function Fi(){let e=[],t=0,n=[],r=[],i=[];function a(){t=0,n.length=0,r.length=0,i.length=0}function o(e){let t=0;return e.isInstancedMesh&&(t+=2),e.isSkinnedMesh&&(t+=1),t}function s(n,r,i,a,s,c){let l=e[t];return l===void 0?(l={id:n.id,object:n,geometry:r,material:i,materialVariant:o(n),groupOrder:a,renderOrder:n.renderOrder,z:s,group:c},e[t]=l):(l.id=n.id,l.object=n,l.geometry=r,l.material=i,l.materialVariant=o(n),l.groupOrder=a,l.renderOrder=n.renderOrder,l.z=s,l.group=c),t++,l}function c(e,t,a,o,c,l){let u=s(e,t,a,o,c,l);a.transmission>0?r.push(u):a.transparent===!0?i.push(u):n.push(u)}function l(e,t,a,o,c,l){let u=s(e,t,a,o,c,l);a.transmission>0?r.unshift(u):a.transparent===!0?i.unshift(u):n.unshift(u)}function u(e,t,a){n.length>1&&n.sort(e||Ni),r.length>1&&r.sort(t||Pi),i.length>1&&i.sort(t||Pi),a&&(n.reverse(),r.reverse(),i.reverse())}function d(){for(let n=t,r=e.length;n<r;n++){let t=e[n];if(t.id===null)break;t.id=null,t.object=null,t.geometry=null,t.material=null,t.group=null}}return{opaque:n,transmissive:r,transparent:i,init:a,push:c,unshift:l,finish:d,sort:u}}function Ii(){let e=new WeakMap;function t(t,n){let r=e.get(t),i;return r===void 0?(i=new Fi,e.set(t,[i])):n>=r.length?(i=new Fi,r.push(i)):i=r[n],i}function n(){e=new WeakMap}return{get:t,dispose:n}}function Li(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case`DirectionalLight`:n={direction:new I,color:new k};break;case`SpotLight`:n={position:new I,direction:new I,color:new k,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case`PointLight`:n={position:new I,color:new k,distance:0,decay:0};break;case`HemisphereLight`:n={direction:new I,skyColor:new k,groundColor:new k};break;case`RectAreaLight`:n={color:new k,position:new I,halfWidth:new I,halfHeight:new I};break}return e[t.id]=n,n}}}function Ri(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case`DirectionalLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new yt};break;case`SpotLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new yt};break;case`PointLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new yt,shadowCameraNear:1,shadowCameraFar:1e3};break}return e[t.id]=n,n}}}var zi=0;function Bi(e,t){return(t.castShadow?2:0)-(e.castShadow?2:0)+ +!!t.map-!!e.map}function Vi(e){let t=new Li,n=Ri(),r={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let e=0;e<9;e++)r.probe.push(new I);let i=new I,a=new We,o=new We;function s(i){let a=0,o=0,s=0;for(let e=0;e<9;e++)r.probe[e].set(0,0,0);let c=0,l=0,u=0,d=0,f=0,p=0,m=0,h=0,g=0,_=0,v=0;i.sort(Bi);for(let e=0,y=i.length;e<y;e++){let y=i[e],b=y.color,x=y.intensity,S=y.distance,C=null;if(y.shadow&&y.shadow.map&&(C=y.shadow.map.texture.format===1030?y.shadow.map.texture:y.shadow.map.depthTexture||y.shadow.map.texture),y.isAmbientLight)a+=b.r*x,o+=b.g*x,s+=b.b*x;else if(y.isLightProbe){for(let e=0;e<9;e++)r.probe[e].addScaledVector(y.sh.coefficients[e],x);v++}else if(y.isDirectionalLight){let e=t.get(y);if(e.color.copy(y.color).multiplyScalar(y.intensity),y.castShadow){let e=y.shadow,t=n.get(y);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize=e.mapSize,r.directionalShadow[c]=t,r.directionalShadowMap[c]=C,r.directionalShadowMatrix[c]=y.shadow.matrix,p++}r.directional[c]=e,c++}else if(y.isSpotLight){let e=t.get(y);e.position.setFromMatrixPosition(y.matrixWorld),e.color.copy(b).multiplyScalar(x),e.distance=S,e.coneCos=Math.cos(y.angle),e.penumbraCos=Math.cos(y.angle*(1-y.penumbra)),e.decay=y.decay,r.spot[u]=e;let i=y.shadow;if(y.map&&(r.spotLightMap[g]=y.map,g++,i.updateMatrices(y),y.castShadow&&_++),r.spotLightMatrix[u]=i.matrix,y.castShadow){let e=n.get(y);e.shadowIntensity=i.intensity,e.shadowBias=i.bias,e.shadowNormalBias=i.normalBias,e.shadowRadius=i.radius,e.shadowMapSize=i.mapSize,r.spotShadow[u]=e,r.spotShadowMap[u]=C,h++}u++}else if(y.isRectAreaLight){let e=t.get(y);e.color.copy(b).multiplyScalar(x),e.halfWidth.set(y.width*.5,0,0),e.halfHeight.set(0,y.height*.5,0),r.rectArea[d]=e,d++}else if(y.isPointLight){let e=t.get(y);if(e.color.copy(y.color).multiplyScalar(y.intensity),e.distance=y.distance,e.decay=y.decay,y.castShadow){let e=y.shadow,t=n.get(y);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize=e.mapSize,t.shadowCameraNear=e.camera.near,t.shadowCameraFar=e.camera.far,r.pointShadow[l]=t,r.pointShadowMap[l]=C,r.pointShadowMatrix[l]=y.shadow.matrix,m++}r.point[l]=e,l++}else if(y.isHemisphereLight){let e=t.get(y);e.skyColor.copy(y.color).multiplyScalar(x),e.groundColor.copy(y.groundColor).multiplyScalar(x),r.hemi[f]=e,f++}}d>0&&(e.has(`OES_texture_float_linear`)===!0?(r.rectAreaLTC1=Z.LTC_FLOAT_1,r.rectAreaLTC2=Z.LTC_FLOAT_2):(r.rectAreaLTC1=Z.LTC_HALF_1,r.rectAreaLTC2=Z.LTC_HALF_2)),r.ambient[0]=a,r.ambient[1]=o,r.ambient[2]=s;let y=r.hash;(y.directionalLength!==c||y.pointLength!==l||y.spotLength!==u||y.rectAreaLength!==d||y.hemiLength!==f||y.numDirectionalShadows!==p||y.numPointShadows!==m||y.numSpotShadows!==h||y.numSpotMaps!==g||y.numLightProbes!==v)&&(r.directional.length=c,r.spot.length=u,r.rectArea.length=d,r.point.length=l,r.hemi.length=f,r.directionalShadow.length=p,r.directionalShadowMap.length=p,r.pointShadow.length=m,r.pointShadowMap.length=m,r.spotShadow.length=h,r.spotShadowMap.length=h,r.directionalShadowMatrix.length=p,r.pointShadowMatrix.length=m,r.spotLightMatrix.length=h+g-_,r.spotLightMap.length=g,r.numSpotLightShadowsWithMaps=_,r.numLightProbes=v,y.directionalLength=c,y.pointLength=l,y.spotLength=u,y.rectAreaLength=d,y.hemiLength=f,y.numDirectionalShadows=p,y.numPointShadows=m,y.numSpotShadows=h,y.numSpotMaps=g,y.numLightProbes=v,r.version=zi++)}function c(e,t){let n=0,s=0,c=0,l=0,u=0,d=t.matrixWorldInverse;for(let t=0,f=e.length;t<f;t++){let f=e[t];if(f.isDirectionalLight){let e=r.directional[n];e.direction.setFromMatrixPosition(f.matrixWorld),i.setFromMatrixPosition(f.target.matrixWorld),e.direction.sub(i),e.direction.transformDirection(d),n++}else if(f.isSpotLight){let e=r.spot[c];e.position.setFromMatrixPosition(f.matrixWorld),e.position.applyMatrix4(d),e.direction.setFromMatrixPosition(f.matrixWorld),i.setFromMatrixPosition(f.target.matrixWorld),e.direction.sub(i),e.direction.transformDirection(d),c++}else if(f.isRectAreaLight){let e=r.rectArea[l];e.position.setFromMatrixPosition(f.matrixWorld),e.position.applyMatrix4(d),o.identity(),a.copy(f.matrixWorld),a.premultiply(d),o.extractRotation(a),e.halfWidth.set(f.width*.5,0,0),e.halfHeight.set(0,f.height*.5,0),e.halfWidth.applyMatrix4(o),e.halfHeight.applyMatrix4(o),l++}else if(f.isPointLight){let e=r.point[s];e.position.setFromMatrixPosition(f.matrixWorld),e.position.applyMatrix4(d),s++}else if(f.isHemisphereLight){let e=r.hemi[u];e.direction.setFromMatrixPosition(f.matrixWorld),e.direction.transformDirection(d),u++}}}return{setup:s,setupView:c,state:r}}function Hi(e){let t=new Vi(e),n=[],r=[],i=[];function a(e){d.camera=e,n.length=0,r.length=0,i.length=0}function o(e){n.push(e)}function s(e){r.push(e)}function c(e){i.push(e)}function l(){t.setup(n)}function u(e){t.setupView(n,e)}let d={lightsArray:n,shadowsArray:r,lightProbeGridArray:i,camera:null,lights:t,transmissionRenderTarget:{},textureUnits:0};return{init:a,state:d,setupLights:l,setupLightsView:u,pushLight:o,pushShadow:s,pushLightProbeGrid:c}}function Ui(e){let t=new WeakMap;function n(n,r=0){let i=t.get(n),a;return i===void 0?(a=new Hi(e),t.set(n,[a])):r>=i.length?(a=new Hi(e),i.push(a)):a=i[r],a}function r(){t=new WeakMap}return{get:n,dispose:r}}var Wi=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Gi=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,Ki=[new I(1,0,0),new I(-1,0,0),new I(0,1,0),new I(0,-1,0),new I(0,0,1),new I(0,0,-1)],qi=[new I(0,-1,0),new I(0,-1,0),new I(0,0,1),new I(0,0,-1),new I(0,-1,0),new I(0,-1,0)],Ji=new We,Yi=new I,Xi=new I;function Zi(e,t,n){let r=new oe,i=new yt,a=new yt,o=new Me,s=new Ye,c=new Ke,l={},u=n.maxTextureSize,d={0:1,1:0,2:2},f=new rt({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new yt},radius:{value:4}},vertexShader:Wi,fragmentShader:Gi}),p=f.clone();p.defines.HORIZONTAL_PASS=1;let m=new Pt;m.setAttribute(`position`,new Ie(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let h=new J(m,f),g=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=1;let _=this.type;this.render=function(t,n,s){if(g.enabled===!1||g.autoUpdate===!1&&g.needsUpdate===!1||t.length===0)return;this.type===2&&(K(`WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead.`),this.type=1);let c=e.getRenderTarget(),l=e.getActiveCubeFace(),d=e.getActiveMipmapLevel(),f=e.state;f.setBlending(0),f.buffers.depth.getReversed()===!0?f.buffers.color.setClear(0,0,0,0):f.buffers.color.setClear(1,1,1,1),f.buffers.depth.setTest(!0),f.setScissorTest(!1);let p=_!==this.type;p&&n.traverse(function(e){e.material&&(Array.isArray(e.material)?e.material.forEach(e=>e.needsUpdate=!0):e.material.needsUpdate=!0)});for(let c=0,l=t.length;c<l;c++){let l=t[c],d=l.shadow;if(d===void 0){K(`WebGLShadowMap:`,l,`has no shadow.`);continue}if(d.autoUpdate===!1&&d.needsUpdate===!1)continue;i.copy(d.mapSize);let m=d.getFrameExtents();i.multiply(m),a.copy(d.mapSize),(i.x>u||i.y>u)&&(i.x>u&&(a.x=Math.floor(u/m.x),i.x=a.x*m.x,d.mapSize.x=a.x),i.y>u&&(a.y=Math.floor(u/m.y),i.y=a.y*m.y,d.mapSize.y=a.y));let h=e.state.buffers.depth.getReversed();if(d.camera._reversedDepth=h,d.map===null||p===!0){if(d.map!==null&&(d.map.depthTexture!==null&&(d.map.depthTexture.dispose(),d.map.depthTexture=null),d.map.dispose()),this.type===3){if(l.isPointLight){K(`WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.`);continue}d.map=new Pe(i.x,i.y,{format:lt,type:Ne,minFilter:G,magFilter:G,generateMipmaps:!1}),d.map.texture.name=l.name+`.shadowMap`,d.map.depthTexture=new zt(i.x,i.y,se),d.map.depthTexture.name=l.name+`.shadowMapDepth`,d.map.depthTexture.format=le,d.map.depthTexture.compareFunction=null,d.map.depthTexture.minFilter=Rt,d.map.depthTexture.magFilter=Rt}else l.isPointLight?(d.map=new On(i.x),d.map.depthTexture=new $e(i.x,Ee)):(d.map=new Pe(i.x,i.y),d.map.depthTexture=new zt(i.x,i.y,Ee)),d.map.depthTexture.name=l.name+`.shadowMap`,d.map.depthTexture.format=le,this.type===1?(d.map.depthTexture.compareFunction=h?518:515,d.map.depthTexture.minFilter=G,d.map.depthTexture.magFilter=G):(d.map.depthTexture.compareFunction=null,d.map.depthTexture.minFilter=Rt,d.map.depthTexture.magFilter=Rt);d.camera.updateProjectionMatrix()}let g=d.map.isWebGLCubeRenderTarget?6:1;for(let t=0;t<g;t++){if(d.map.isWebGLCubeRenderTarget)e.setRenderTarget(d.map,t),e.clear();else{t===0&&(e.setRenderTarget(d.map),e.clear());let n=d.getViewport(t);o.set(a.x*n.x,a.y*n.y,a.x*n.z,a.y*n.w),f.viewport(o)}if(l.isPointLight){let e=d.camera,n=d.matrix,r=l.distance||e.far;r!==e.far&&(e.far=r,e.updateProjectionMatrix()),Yi.setFromMatrixPosition(l.matrixWorld),e.position.copy(Yi),Xi.copy(e.position),Xi.add(Ki[t]),e.up.copy(qi[t]),e.lookAt(Xi),e.updateMatrixWorld(),n.makeTranslation(-Yi.x,-Yi.y,-Yi.z),Ji.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),d._frustum.setFromProjectionMatrix(Ji,e.coordinateSystem,e.reversedDepth)}else d.updateMatrices(l);r=d.getFrustum(),b(n,s,d.camera,l,this.type)}d.isPointLightShadow!==!0&&this.type===3&&v(d,s),d.needsUpdate=!1}_=this.type,g.needsUpdate=!1,e.setRenderTarget(c,l,d)};function v(n,r){let a=t.update(h);f.defines.VSM_SAMPLES!==n.blurSamples&&(f.defines.VSM_SAMPLES=n.blurSamples,p.defines.VSM_SAMPLES=n.blurSamples,f.needsUpdate=!0,p.needsUpdate=!0),n.mapPass===null&&(n.mapPass=new Pe(i.x,i.y,{format:lt,type:Ne})),f.uniforms.shadow_pass.value=n.map.depthTexture,f.uniforms.resolution.value=n.mapSize,f.uniforms.radius.value=n.radius,e.setRenderTarget(n.mapPass),e.clear(),e.renderBufferDirect(r,null,a,f,h,null),p.uniforms.shadow_pass.value=n.mapPass.texture,p.uniforms.resolution.value=n.mapSize,p.uniforms.radius.value=n.radius,e.setRenderTarget(n.map),e.clear(),e.renderBufferDirect(r,null,a,p,h,null)}function y(t,n,r,i){let a=null,o=r.isPointLight===!0?t.customDistanceMaterial:t.customDepthMaterial;if(o!==void 0)a=o;else if(a=r.isPointLight===!0?c:s,e.localClippingEnabled&&n.clipShadows===!0&&Array.isArray(n.clippingPlanes)&&n.clippingPlanes.length!==0||n.displacementMap&&n.displacementScale!==0||n.alphaMap&&n.alphaTest>0||n.map&&n.alphaTest>0||n.alphaToCoverage===!0){let e=a.uuid,t=n.uuid,r=l[e];r===void 0&&(r={},l[e]=r);let i=r[t];i===void 0&&(i=a.clone(),r[t]=i,n.addEventListener(`dispose`,x)),a=i}if(a.visible=n.visible,a.wireframe=n.wireframe,i===3?a.side=n.shadowSide===null?n.side:n.shadowSide:a.side=n.shadowSide===null?d[n.side]:n.shadowSide,a.alphaMap=n.alphaMap,a.alphaTest=n.alphaToCoverage===!0?.5:n.alphaTest,a.map=n.map,a.clipShadows=n.clipShadows,a.clippingPlanes=n.clippingPlanes,a.clipIntersection=n.clipIntersection,a.displacementMap=n.displacementMap,a.displacementScale=n.displacementScale,a.displacementBias=n.displacementBias,a.wireframeLinewidth=n.wireframeLinewidth,a.linewidth=n.linewidth,r.isPointLight===!0&&a.isMeshDistanceMaterial===!0){let t=e.properties.get(a);t.light=r}return a}function b(n,i,a,o,s){if(n.visible===!1)return;if(n.layers.test(i.layers)&&(n.isMesh||n.isLine||n.isPoints)&&(n.castShadow||n.receiveShadow&&s===3)&&(!n.frustumCulled||r.intersectsObject(n))){n.modelViewMatrix.multiplyMatrices(a.matrixWorldInverse,n.matrixWorld);let r=t.update(n),c=n.material;if(Array.isArray(c)){let t=r.groups;for(let l=0,u=t.length;l<u;l++){let u=t[l],d=c[u.materialIndex];if(d&&d.visible){let t=y(n,d,o,s);n.onBeforeShadow(e,n,i,a,r,t,u),e.renderBufferDirect(a,null,r,t,n,u),n.onAfterShadow(e,n,i,a,r,t,u)}}}else if(c.visible){let t=y(n,c,o,s);n.onBeforeShadow(e,n,i,a,r,t,null),e.renderBufferDirect(a,null,r,t,n,null),n.onAfterShadow(e,n,i,a,r,t,null)}}let c=n.children;for(let e=0,t=c.length;e<t;e++)b(c[e],i,a,o,s)}function x(e){e.target.removeEventListener(`dispose`,x);for(let t in l){let n=l[t],r=e.target.uuid;r in n&&(n[r].dispose(),delete n[r])}}}function Qi(e,t){function n(){let t=!1,n=new Me,r=null,i=new Me(0,0,0,0);return{setMask:function(n){r!==n&&!t&&(e.colorMask(n,n,n,n),r=n)},setLocked:function(e){t=e},setClear:function(t,r,a,o,s){s===!0&&(t*=o,r*=o,a*=o),n.set(t,r,a,o),i.equals(n)===!1&&(e.clearColor(t,r,a,o),i.copy(n))},reset:function(){t=!1,r=null,i.set(-1,0,0,0)}}}function r(){let n=!1,r=!1,i=null,a=null,o=null;return{setReversed:function(e){if(r!==e){let n=t.get(`EXT_clip_control`);e?n.clipControlEXT(n.LOWER_LEFT_EXT,n.ZERO_TO_ONE_EXT):n.clipControlEXT(n.LOWER_LEFT_EXT,n.NEGATIVE_ONE_TO_ONE_EXT),r=e;let i=o;o=null,this.setClear(i)}},getReversed:function(){return r},setTest:function(t){t?ce(e.DEPTH_TEST):le(e.DEPTH_TEST)},setMask:function(t){i!==t&&!n&&(e.depthMask(t),i=t)},setFunc:function(t){if(r&&(t=Le[t]),a!==t){switch(t){case 0:e.depthFunc(e.NEVER);break;case 1:e.depthFunc(e.ALWAYS);break;case 2:e.depthFunc(e.LESS);break;case 3:e.depthFunc(e.LEQUAL);break;case 4:e.depthFunc(e.EQUAL);break;case 5:e.depthFunc(e.GEQUAL);break;case 6:e.depthFunc(e.GREATER);break;case 7:e.depthFunc(e.NOTEQUAL);break;default:e.depthFunc(e.LEQUAL)}a=t}},setLocked:function(e){n=e},setClear:function(t){o!==t&&(o=t,r&&(t=1-t),e.clearDepth(t))},reset:function(){n=!1,i=null,a=null,o=null,r=!1}}}function i(){let t=!1,n=null,r=null,i=null,a=null,o=null,s=null,c=null,l=null;return{setTest:function(n){t||(n?ce(e.STENCIL_TEST):le(e.STENCIL_TEST))},setMask:function(r){n!==r&&!t&&(e.stencilMask(r),n=r)},setFunc:function(t,n,o){(r!==t||i!==n||a!==o)&&(e.stencilFunc(t,n,o),r=t,i=n,a=o)},setOp:function(t,n,r){(o!==t||s!==n||c!==r)&&(e.stencilOp(t,n,r),o=t,s=n,c=r)},setLocked:function(e){t=e},setClear:function(t){l!==t&&(e.clearStencil(t),l=t)},reset:function(){t=!1,n=null,r=null,i=null,a=null,o=null,s=null,c=null,l=null}}}let a=new n,o=new r,s=new i,c=new WeakMap,l=new WeakMap,u={},d={},f={},p=new WeakMap,m=[],h=null,g=!1,_=null,v=null,y=null,b=null,x=null,S=null,C=null,w=new k(0,0,0),T=0,E=!1,D=null,O=null,A=null,j=null,ee=null,te=e.getParameter(e.MAX_COMBINED_TEXTURE_IMAGE_UNITS),ne=!1,M=0,re=e.getParameter(e.VERSION);re.indexOf(`WebGL`)===-1?re.indexOf(`OpenGL ES`)!==-1&&(M=parseFloat(/^OpenGL ES (\d)/.exec(re)[1]),ne=M>=2):(M=parseFloat(/^WebGL (\d)/.exec(re)[1]),ne=M>=1);let N=null,ie={},P=e.getParameter(e.SCISSOR_BOX),F=e.getParameter(e.VIEWPORT),ae=new Me().fromArray(P),oe=new Me().fromArray(F);function I(t,n,r,i){let a=new Uint8Array(4),o=e.createTexture();e.bindTexture(t,o),e.texParameteri(t,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(t,e.TEXTURE_MAG_FILTER,e.NEAREST);for(let o=0;o<r;o++)t===e.TEXTURE_3D||t===e.TEXTURE_2D_ARRAY?e.texImage3D(n,0,e.RGBA,1,1,i,0,e.RGBA,e.UNSIGNED_BYTE,a):e.texImage2D(n+o,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,a);return o}let se={};se[e.TEXTURE_2D]=I(e.TEXTURE_2D,e.TEXTURE_2D,1),se[e.TEXTURE_CUBE_MAP]=I(e.TEXTURE_CUBE_MAP,e.TEXTURE_CUBE_MAP_POSITIVE_X,6),se[e.TEXTURE_2D_ARRAY]=I(e.TEXTURE_2D_ARRAY,e.TEXTURE_2D_ARRAY,1,1),se[e.TEXTURE_3D]=I(e.TEXTURE_3D,e.TEXTURE_3D,1,1),a.setClear(0,0,0,1),o.setClear(1),s.setClear(0),ce(e.DEPTH_TEST),o.setFunc(3),me(!1),he(1),ce(e.CULL_FACE),R(0);function ce(t){u[t]!==!0&&(e.enable(t),u[t]=!0)}function le(t){u[t]!==!1&&(e.disable(t),u[t]=!1)}function ue(t,n){return f[t]===n?!1:(e.bindFramebuffer(t,n),f[t]=n,t===e.DRAW_FRAMEBUFFER&&(f[e.FRAMEBUFFER]=n),t===e.FRAMEBUFFER&&(f[e.DRAW_FRAMEBUFFER]=n),!0)}function de(t,n){let r=m,i=!1;if(t){r=p.get(n),r===void 0&&(r=[],p.set(n,r));let a=t.textures;if(r.length!==a.length||r[0]!==e.COLOR_ATTACHMENT0){for(let t=0,n=a.length;t<n;t++)r[t]=e.COLOR_ATTACHMENT0+t;r.length=a.length,i=!0}}else r[0]!==e.BACK&&(r[0]=e.BACK,i=!0);i&&e.drawBuffers(r)}function fe(t){return h===t?!1:(e.useProgram(t),h=t,!0)}let L={100:e.FUNC_ADD,101:e.FUNC_SUBTRACT,102:e.FUNC_REVERSE_SUBTRACT};L[103]=e.MIN,L[104]=e.MAX;let pe={200:e.ZERO,201:e.ONE,202:e.SRC_COLOR,204:e.SRC_ALPHA,210:e.SRC_ALPHA_SATURATE,208:e.DST_COLOR,206:e.DST_ALPHA,203:e.ONE_MINUS_SRC_COLOR,205:e.ONE_MINUS_SRC_ALPHA,209:e.ONE_MINUS_DST_COLOR,207:e.ONE_MINUS_DST_ALPHA,211:e.CONSTANT_COLOR,212:e.ONE_MINUS_CONSTANT_COLOR,213:e.CONSTANT_ALPHA,214:e.ONE_MINUS_CONSTANT_ALPHA};function R(t,n,r,i,a,o,s,c,l,u){if(t===0){g===!0&&(le(e.BLEND),g=!1);return}if(g===!1&&(ce(e.BLEND),g=!0),t!==5){if(t!==_||u!==E){if((v!==100||x!==100)&&(e.blendEquation(e.FUNC_ADD),v=100,x=100),u)switch(t){case 1:e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case 2:e.blendFunc(e.ONE,e.ONE);break;case 3:e.blendFuncSeparate(e.ZERO,e.ONE_MINUS_SRC_COLOR,e.ZERO,e.ONE);break;case 4:e.blendFuncSeparate(e.DST_COLOR,e.ONE_MINUS_SRC_ALPHA,e.ZERO,e.ONE);break;default:ft(`WebGLState: Invalid blending: `,t);break}else switch(t){case 1:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case 2:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE,e.ONE,e.ONE);break;case 3:ft(`WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true`);break;case 4:ft(`WebGLState: MultiplyBlending requires material.premultipliedAlpha = true`);break;default:ft(`WebGLState: Invalid blending: `,t);break}y=null,b=null,S=null,C=null,w.set(0,0,0),T=0,_=t,E=u}return}a||=n,o||=r,s||=i,(n!==v||a!==x)&&(e.blendEquationSeparate(L[n],L[a]),v=n,x=a),(r!==y||i!==b||o!==S||s!==C)&&(e.blendFuncSeparate(pe[r],pe[i],pe[o],pe[s]),y=r,b=i,S=o,C=s),(c.equals(w)===!1||l!==T)&&(e.blendColor(c.r,c.g,c.b,l),w.copy(c),T=l),_=t,E=!1}function z(t,n){t.side===2?le(e.CULL_FACE):ce(e.CULL_FACE);let r=t.side===1;n&&(r=!r),me(r),t.blending===1&&t.transparent===!1?R(0):R(t.blending,t.blendEquation,t.blendSrc,t.blendDst,t.blendEquationAlpha,t.blendSrcAlpha,t.blendDstAlpha,t.blendColor,t.blendAlpha,t.premultipliedAlpha),o.setFunc(t.depthFunc),o.setTest(t.depthTest),o.setMask(t.depthWrite),a.setMask(t.colorWrite);let i=t.stencilWrite;s.setTest(i),i&&(s.setMask(t.stencilWriteMask),s.setFunc(t.stencilFunc,t.stencilRef,t.stencilFuncMask),s.setOp(t.stencilFail,t.stencilZFail,t.stencilZPass)),_e(t.polygonOffset,t.polygonOffsetFactor,t.polygonOffsetUnits),t.alphaToCoverage===!0?ce(e.SAMPLE_ALPHA_TO_COVERAGE):le(e.SAMPLE_ALPHA_TO_COVERAGE)}function me(t){D!==t&&(t?e.frontFace(e.CW):e.frontFace(e.CCW),D=t)}function he(t){t===0?le(e.CULL_FACE):(ce(e.CULL_FACE),t!==O&&(t===1?e.cullFace(e.BACK):t===2?e.cullFace(e.FRONT):e.cullFace(e.FRONT_AND_BACK))),O=t}function ge(t){t!==A&&(ne&&e.lineWidth(t),A=t)}function _e(t,n,r){t?(ce(e.POLYGON_OFFSET_FILL),(j!==n||ee!==r)&&(j=n,ee=r,o.getReversed()&&(n=-n),e.polygonOffset(n,r))):le(e.POLYGON_OFFSET_FILL)}function ve(t){t?ce(e.SCISSOR_TEST):le(e.SCISSOR_TEST)}function ye(t){t===void 0&&(t=e.TEXTURE0+te-1),N!==t&&(e.activeTexture(t),N=t)}function be(t,n,r){r===void 0&&(r=N===null?e.TEXTURE0+te-1:N);let i=ie[r];i===void 0&&(i={type:void 0,texture:void 0},ie[r]=i),(i.type!==t||i.texture!==n)&&(N!==r&&(e.activeTexture(r),N=r),e.bindTexture(t,n||se[t]),i.type=t,i.texture=n)}function xe(){let t=ie[N];t!==void 0&&t.type!==void 0&&(e.bindTexture(t.type,null),t.type=void 0,t.texture=void 0)}function Se(){try{e.compressedTexImage2D(...arguments)}catch(e){ft(`WebGLState:`,e)}}function Ce(){try{e.compressedTexImage3D(...arguments)}catch(e){ft(`WebGLState:`,e)}}function we(){try{e.texSubImage2D(...arguments)}catch(e){ft(`WebGLState:`,e)}}function Te(){try{e.texSubImage3D(...arguments)}catch(e){ft(`WebGLState:`,e)}}function B(){try{e.compressedTexSubImage2D(...arguments)}catch(e){ft(`WebGLState:`,e)}}function Ee(){try{e.compressedTexSubImage3D(...arguments)}catch(e){ft(`WebGLState:`,e)}}function De(){try{e.texStorage2D(...arguments)}catch(e){ft(`WebGLState:`,e)}}function Oe(){try{e.texStorage3D(...arguments)}catch(e){ft(`WebGLState:`,e)}}function ke(){try{e.texImage2D(...arguments)}catch(e){ft(`WebGLState:`,e)}}function Ae(){try{e.texImage3D(...arguments)}catch(e){ft(`WebGLState:`,e)}}function V(t){return d[t]===void 0?e.getParameter(t):d[t]}function je(t,n){d[t]!==n&&(e.pixelStorei(t,n),d[t]=n)}function Ne(t){ae.equals(t)===!1&&(e.scissor(t.x,t.y,t.z,t.w),ae.copy(t))}function Pe(t){oe.equals(t)===!1&&(e.viewport(t.x,t.y,t.z,t.w),oe.copy(t))}function H(t,n){let r=l.get(n);r===void 0&&(r=new WeakMap,l.set(n,r));let i=r.get(t);i===void 0&&(i=e.getUniformBlockIndex(n,t.name),r.set(t,i))}function U(t,n){let r=l.get(n).get(t);c.get(n)!==r&&(e.uniformBlockBinding(n,r,t.__bindingPointIndex),c.set(n,r))}function W(){e.disable(e.BLEND),e.disable(e.CULL_FACE),e.disable(e.DEPTH_TEST),e.disable(e.POLYGON_OFFSET_FILL),e.disable(e.SCISSOR_TEST),e.disable(e.STENCIL_TEST),e.disable(e.SAMPLE_ALPHA_TO_COVERAGE),e.blendEquation(e.FUNC_ADD),e.blendFunc(e.ONE,e.ZERO),e.blendFuncSeparate(e.ONE,e.ZERO,e.ONE,e.ZERO),e.blendColor(0,0,0,0),e.colorMask(!0,!0,!0,!0),e.clearColor(0,0,0,0),e.depthMask(!0),e.depthFunc(e.LESS),o.setReversed(!1),e.clearDepth(1),e.stencilMask(4294967295),e.stencilFunc(e.ALWAYS,0,4294967295),e.stencilOp(e.KEEP,e.KEEP,e.KEEP),e.clearStencil(0),e.cullFace(e.BACK),e.frontFace(e.CCW),e.polygonOffset(0,0),e.activeTexture(e.TEXTURE0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),e.bindFramebuffer(e.READ_FRAMEBUFFER,null),e.useProgram(null),e.lineWidth(1),e.scissor(0,0,e.canvas.width,e.canvas.height),e.viewport(0,0,e.canvas.width,e.canvas.height),e.pixelStorei(e.PACK_ALIGNMENT,4),e.pixelStorei(e.UNPACK_ALIGNMENT,4),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,e.BROWSER_DEFAULT_WEBGL),e.pixelStorei(e.PACK_ROW_LENGTH,0),e.pixelStorei(e.PACK_SKIP_PIXELS,0),e.pixelStorei(e.PACK_SKIP_ROWS,0),e.pixelStorei(e.UNPACK_ROW_LENGTH,0),e.pixelStorei(e.UNPACK_IMAGE_HEIGHT,0),e.pixelStorei(e.UNPACK_SKIP_PIXELS,0),e.pixelStorei(e.UNPACK_SKIP_ROWS,0),e.pixelStorei(e.UNPACK_SKIP_IMAGES,0),u={},d={},N=null,ie={},f={},p=new WeakMap,m=[],h=null,g=!1,_=null,v=null,y=null,b=null,x=null,S=null,C=null,w=new k(0,0,0),T=0,E=!1,D=null,O=null,A=null,j=null,ee=null,ae.set(0,0,e.canvas.width,e.canvas.height),oe.set(0,0,e.canvas.width,e.canvas.height),a.reset(),o.reset(),s.reset()}return{buffers:{color:a,depth:o,stencil:s},enable:ce,disable:le,bindFramebuffer:ue,drawBuffers:de,useProgram:fe,setBlending:R,setMaterial:z,setFlipSided:me,setCullFace:he,setLineWidth:ge,setPolygonOffset:_e,setScissorTest:ve,activeTexture:ye,bindTexture:be,unbindTexture:xe,compressedTexImage2D:Se,compressedTexImage3D:Ce,texImage2D:ke,texImage3D:Ae,pixelStorei:je,getParameter:V,updateUBOMapping:H,uniformBlockBinding:U,texStorage2D:De,texStorage3D:Oe,texSubImage2D:we,texSubImage3D:Te,compressedTexSubImage2D:B,compressedTexSubImage3D:Ee,scissor:Ne,viewport:Pe,reset:W}}function $i(e,t,n,r,i,a,o){let s=t.has(`WEBGL_multisampled_render_to_texture`)?t.get(`WEBGL_multisampled_render_to_texture`):null,c=typeof navigator>`u`?!1:/OculusBrowser/g.test(navigator.userAgent),l=new yt,u=new WeakMap,d=new Set,f,p=new WeakMap,m=!1;try{m=typeof OffscreenCanvas<`u`&&new OffscreenCanvas(1,1).getContext(`2d`)!==null}catch{}function h(e,t){return m?new OffscreenCanvas(e,t):Tt(`canvas`)}function g(e,t,n){let r=1,i=we(e);if((i.width>n||i.height>n)&&(r=n/Math.max(i.width,i.height)),r<1)if(typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap||typeof VideoFrame<`u`&&e instanceof VideoFrame){let n=Math.floor(r*i.width),a=Math.floor(r*i.height);f===void 0&&(f=h(n,a));let o=t?h(n,a):f;return o.width=n,o.height=a,o.getContext(`2d`).drawImage(e,0,0,n,a),K(`WebGLRenderer: Texture has been resized from (`+i.width+`x`+i.height+`) to (`+n+`x`+a+`).`),o}else return`data`in e&&K(`WebGLRenderer: Image in DataTexture is too big (`+i.width+`x`+i.height+`).`),e;return e}function _(e){return e.generateMipmaps}function v(t){e.generateMipmap(t)}function y(t){return t.isWebGLCubeRenderTarget?e.TEXTURE_CUBE_MAP:t.isWebGL3DRenderTarget?e.TEXTURE_3D:t.isWebGLArrayRenderTarget||t.isCompressedArrayTexture?e.TEXTURE_2D_ARRAY:e.TEXTURE_2D}function b(n,r,i,a,o,s=!1){if(n!==null){if(e[n]!==void 0)return e[n];K(`WebGLRenderer: Attempt to use non-existing WebGL internal format '`+n+`'`)}let c;a&&(c=t.get(`EXT_texture_norm16`),c||K(`WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension`));let l=r;if(r===e.RED&&(i===e.FLOAT&&(l=e.R32F),i===e.HALF_FLOAT&&(l=e.R16F),i===e.UNSIGNED_BYTE&&(l=e.R8),i===e.UNSIGNED_SHORT&&c&&(l=c.R16_EXT),i===e.SHORT&&c&&(l=c.R16_SNORM_EXT)),r===e.RED_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.R8UI),i===e.UNSIGNED_SHORT&&(l=e.R16UI),i===e.UNSIGNED_INT&&(l=e.R32UI),i===e.BYTE&&(l=e.R8I),i===e.SHORT&&(l=e.R16I),i===e.INT&&(l=e.R32I)),r===e.RG&&(i===e.FLOAT&&(l=e.RG32F),i===e.HALF_FLOAT&&(l=e.RG16F),i===e.UNSIGNED_BYTE&&(l=e.RG8),i===e.UNSIGNED_SHORT&&c&&(l=c.RG16_EXT),i===e.SHORT&&c&&(l=c.RG16_SNORM_EXT)),r===e.RG_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.RG8UI),i===e.UNSIGNED_SHORT&&(l=e.RG16UI),i===e.UNSIGNED_INT&&(l=e.RG32UI),i===e.BYTE&&(l=e.RG8I),i===e.SHORT&&(l=e.RG16I),i===e.INT&&(l=e.RG32I)),r===e.RGB_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.RGB8UI),i===e.UNSIGNED_SHORT&&(l=e.RGB16UI),i===e.UNSIGNED_INT&&(l=e.RGB32UI),i===e.BYTE&&(l=e.RGB8I),i===e.SHORT&&(l=e.RGB16I),i===e.INT&&(l=e.RGB32I)),r===e.RGBA_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.RGBA8UI),i===e.UNSIGNED_SHORT&&(l=e.RGBA16UI),i===e.UNSIGNED_INT&&(l=e.RGBA32UI),i===e.BYTE&&(l=e.RGBA8I),i===e.SHORT&&(l=e.RGBA16I),i===e.INT&&(l=e.RGBA32I)),r===e.RGB&&(i===e.UNSIGNED_SHORT&&c&&(l=c.RGB16_EXT),i===e.SHORT&&c&&(l=c.RGB16_SNORM_EXT),i===e.UNSIGNED_INT_5_9_9_9_REV&&(l=e.RGB9_E5),i===e.UNSIGNED_INT_10F_11F_11F_REV&&(l=e.R11F_G11F_B10F)),r===e.RGBA){let t=s?st:z.getTransfer(o);i===e.FLOAT&&(l=e.RGBA32F),i===e.HALF_FLOAT&&(l=e.RGBA16F),i===e.UNSIGNED_BYTE&&(l=t===`srgb`?e.SRGB8_ALPHA8:e.RGBA8),i===e.UNSIGNED_SHORT&&c&&(l=c.RGBA16_EXT),i===e.SHORT&&c&&(l=c.RGBA16_SNORM_EXT),i===e.UNSIGNED_SHORT_4_4_4_4&&(l=e.RGBA4),i===e.UNSIGNED_SHORT_5_5_5_1&&(l=e.RGB5_A1)}return(l===e.R16F||l===e.R32F||l===e.RG16F||l===e.RG32F||l===e.RGBA16F||l===e.RGBA32F)&&t.get(`EXT_color_buffer_float`),l}function x(t,n){let r;return t?n===null||n===1014||n===1020?r=e.DEPTH24_STENCIL8:n===1015?r=e.DEPTH32F_STENCIL8:n===1012&&(r=e.DEPTH24_STENCIL8,K(`DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.`)):n===null||n===1014||n===1020?r=e.DEPTH_COMPONENT24:n===1015?r=e.DEPTH_COMPONENT32F:n===1012&&(r=e.DEPTH_COMPONENT16),r}function S(e,t){return _(e)===!0||e.isFramebufferTexture&&e.minFilter!==1003&&e.minFilter!==1006?Math.log2(Math.max(t.width,t.height))+1:e.mipmaps!==void 0&&e.mipmaps.length>0?e.mipmaps.length:e.isCompressedTexture&&Array.isArray(e.image)?t.mipmaps.length:1}function C(e){let t=e.target;t.removeEventListener(`dispose`,C),T(t),t.isVideoTexture&&u.delete(t),t.isHTMLTexture&&d.delete(t)}function w(e){let t=e.target;t.removeEventListener(`dispose`,w),D(t)}function T(e){let t=r.get(e);if(t.__webglInit===void 0)return;let n=e.source,i=p.get(n);if(i){let r=i[t.__cacheKey];r.usedTimes--,r.usedTimes===0&&E(e),Object.keys(i).length===0&&p.delete(n)}r.remove(e)}function E(t){let n=r.get(t);e.deleteTexture(n.__webglTexture);let i=t.source,a=p.get(i);delete a[n.__cacheKey],o.memory.textures--}function D(t){let n=r.get(t);if(t.depthTexture&&(t.depthTexture.dispose(),r.remove(t.depthTexture)),t.isWebGLCubeRenderTarget)for(let t=0;t<6;t++){if(Array.isArray(n.__webglFramebuffer[t]))for(let r=0;r<n.__webglFramebuffer[t].length;r++)e.deleteFramebuffer(n.__webglFramebuffer[t][r]);else e.deleteFramebuffer(n.__webglFramebuffer[t]);n.__webglDepthbuffer&&e.deleteRenderbuffer(n.__webglDepthbuffer[t])}else{if(Array.isArray(n.__webglFramebuffer))for(let t=0;t<n.__webglFramebuffer.length;t++)e.deleteFramebuffer(n.__webglFramebuffer[t]);else e.deleteFramebuffer(n.__webglFramebuffer);if(n.__webglDepthbuffer&&e.deleteRenderbuffer(n.__webglDepthbuffer),n.__webglMultisampledFramebuffer&&e.deleteFramebuffer(n.__webglMultisampledFramebuffer),n.__webglColorRenderbuffer)for(let t=0;t<n.__webglColorRenderbuffer.length;t++)n.__webglColorRenderbuffer[t]&&e.deleteRenderbuffer(n.__webglColorRenderbuffer[t]);n.__webglDepthRenderbuffer&&e.deleteRenderbuffer(n.__webglDepthRenderbuffer)}let i=t.textures;for(let t=0,n=i.length;t<n;t++){let n=r.get(i[t]);n.__webglTexture&&(e.deleteTexture(n.__webglTexture),o.memory.textures--),r.remove(i[t])}r.remove(t)}let O=0;function k(){O=0}function A(){return O}function j(e){O=e}function te(){let e=O;return e>=i.maxTextures&&K(`WebGLTextures: Trying to use `+e+` texture units while this GPU supports only `+i.maxTextures),O+=1,e}function ne(e){let t=[];return t.push(e.wrapS),t.push(e.wrapT),t.push(e.wrapR||0),t.push(e.magFilter),t.push(e.minFilter),t.push(e.anisotropy),t.push(e.internalFormat),t.push(e.format),t.push(e.type),t.push(e.generateMipmaps),t.push(e.premultiplyAlpha),t.push(e.flipY),t.push(e.unpackAlignment),t.push(e.colorSpace),t.join()}function M(t,i){let a=r.get(t);if(t.isVideoTexture&&Se(t),t.isRenderTargetTexture===!1&&t.isExternalTexture!==!0&&t.version>0&&a.__version!==t.version){let e=t.image;if(e===null)K(`WebGLRenderer: Texture marked for update but no image data found.`);else if(e.complete===!1)K(`WebGLRenderer: Texture marked for update but image is incomplete`);else{le(a,t,i);return}}else t.isExternalTexture&&(a.__webglTexture=t.sourceTexture?t.sourceTexture:null);n.bindTexture(e.TEXTURE_2D,a.__webglTexture,e.TEXTURE0+i)}function re(t,i){let a=r.get(t);if(t.isRenderTargetTexture===!1&&t.version>0&&a.__version!==t.version){le(a,t,i);return}else t.isExternalTexture&&(a.__webglTexture=t.sourceTexture?t.sourceTexture:null);n.bindTexture(e.TEXTURE_2D_ARRAY,a.__webglTexture,e.TEXTURE0+i)}function N(t,i){let a=r.get(t);if(t.isRenderTargetTexture===!1&&t.version>0&&a.__version!==t.version){le(a,t,i);return}n.bindTexture(e.TEXTURE_3D,a.__webglTexture,e.TEXTURE0+i)}function ie(t,i){let a=r.get(t);if(t.isCubeDepthTexture!==!0&&t.version>0&&a.__version!==t.version){ue(a,t,i);return}n.bindTexture(e.TEXTURE_CUBE_MAP,a.__webglTexture,e.TEXTURE0+i)}let P={[Lt]:e.REPEAT,[ee]:e.CLAMP_TO_EDGE,[jt]:e.MIRRORED_REPEAT},F={[Rt]:e.NEAREST,[It]:e.NEAREST_MIPMAP_NEAREST,[Re]:e.NEAREST_MIPMAP_LINEAR,[G]:e.LINEAR,[wt]:e.LINEAR_MIPMAP_NEAREST,[gt]:e.LINEAR_MIPMAP_LINEAR},ae={512:e.NEVER,519:e.ALWAYS,513:e.LESS,515:e.LEQUAL,514:e.EQUAL,518:e.GEQUAL,516:e.GREATER,517:e.NOTEQUAL};function oe(n,a){if(a.type===1015&&t.has(`OES_texture_float_linear`)===!1&&(a.magFilter===1006||a.magFilter===1007||a.magFilter===1005||a.magFilter===1008||a.minFilter===1006||a.minFilter===1007||a.minFilter===1005||a.minFilter===1008)&&K(`WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device.`),e.texParameteri(n,e.TEXTURE_WRAP_S,P[a.wrapS]),e.texParameteri(n,e.TEXTURE_WRAP_T,P[a.wrapT]),(n===e.TEXTURE_3D||n===e.TEXTURE_2D_ARRAY)&&e.texParameteri(n,e.TEXTURE_WRAP_R,P[a.wrapR]),e.texParameteri(n,e.TEXTURE_MAG_FILTER,F[a.magFilter]),e.texParameteri(n,e.TEXTURE_MIN_FILTER,F[a.minFilter]),a.compareFunction&&(e.texParameteri(n,e.TEXTURE_COMPARE_MODE,e.COMPARE_REF_TO_TEXTURE),e.texParameteri(n,e.TEXTURE_COMPARE_FUNC,ae[a.compareFunction])),t.has(`EXT_texture_filter_anisotropic`)===!0){if(a.magFilter===1003||a.minFilter!==1005&&a.minFilter!==1008||a.type===1015&&t.has(`OES_texture_float_linear`)===!1)return;if(a.anisotropy>1||r.get(a).__currentAnisotropy){let o=t.get(`EXT_texture_filter_anisotropic`);e.texParameterf(n,o.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(a.anisotropy,i.getMaxAnisotropy())),r.get(a).__currentAnisotropy=a.anisotropy}}}function I(t,n){let r=!1;t.__webglInit===void 0&&(t.__webglInit=!0,n.addEventListener(`dispose`,C));let i=n.source,a=p.get(i);a===void 0&&(a={},p.set(i,a));let s=ne(n);if(s!==t.__cacheKey){a[s]===void 0&&(a[s]={texture:e.createTexture(),usedTimes:0},o.memory.textures++,r=!0),a[s].usedTimes++;let i=a[t.__cacheKey];i!==void 0&&(a[t.__cacheKey].usedTimes--,i.usedTimes===0&&E(n)),t.__cacheKey=s,t.__webglTexture=a[s].texture}return r}function se(e,t,n){return Math.floor(Math.floor(e/n)/t)}function ce(t,r,i,a){let o=t.updateRanges;if(o.length===0)n.texSubImage2D(e.TEXTURE_2D,0,0,0,r.width,r.height,i,a,r.data);else{o.sort((e,t)=>e.start-t.start);let s=0;for(let e=1;e<o.length;e++){let t=o[s],n=o[e],i=t.start+t.count,a=se(n.start,r.width,4),c=se(t.start,r.width,4);n.start<=i+1&&a===c&&se(n.start+n.count-1,r.width,4)===a?t.count=Math.max(t.count,n.start+n.count-t.start):(++s,o[s]=n)}o.length=s+1;let c=n.getParameter(e.UNPACK_ROW_LENGTH),l=n.getParameter(e.UNPACK_SKIP_PIXELS),u=n.getParameter(e.UNPACK_SKIP_ROWS);n.pixelStorei(e.UNPACK_ROW_LENGTH,r.width);for(let t=0,s=o.length;t<s;t++){let s=o[t],c=Math.floor(s.start/4),l=Math.ceil(s.count/4),u=c%r.width,d=Math.floor(c/r.width),f=l;n.pixelStorei(e.UNPACK_SKIP_PIXELS,u),n.pixelStorei(e.UNPACK_SKIP_ROWS,d),n.texSubImage2D(e.TEXTURE_2D,0,u,d,f,1,i,a,r.data)}t.clearUpdateRanges(),n.pixelStorei(e.UNPACK_ROW_LENGTH,c),n.pixelStorei(e.UNPACK_SKIP_PIXELS,l),n.pixelStorei(e.UNPACK_SKIP_ROWS,u)}}function le(t,o,s){let c=e.TEXTURE_2D;(o.isDataArrayTexture||o.isCompressedArrayTexture)&&(c=e.TEXTURE_2D_ARRAY),o.isData3DTexture&&(c=e.TEXTURE_3D);let l=I(t,o),u=o.source;n.bindTexture(c,t.__webglTexture,e.TEXTURE0+s);let f=r.get(u);if(u.version!==f.__version||l===!0){if(n.activeTexture(e.TEXTURE0+s),!(typeof ImageBitmap<`u`&&o.image instanceof ImageBitmap)){let t=z.getPrimaries(z.workingColorSpace),r=o.colorSpace===``?null:z.getPrimaries(o.colorSpace),i=o.colorSpace===``||t===r?e.NONE:e.BROWSER_DEFAULT_WEBGL;n.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,o.flipY),n.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,o.premultiplyAlpha),n.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,i)}n.pixelStorei(e.UNPACK_ALIGNMENT,o.unpackAlignment);let t=g(o.image,!1,i.maxTextureSize);t=Ce(o,t);let r=a.convert(o.format,o.colorSpace),p=a.convert(o.type),m=b(o.internalFormat,r,p,o.normalized,o.colorSpace,o.isVideoTexture);oe(c,o);let h,y=o.mipmaps,C=o.isVideoTexture!==!0,w=f.__version===void 0||l===!0,T=u.dataReady,E=S(o,t);if(o.isDepthTexture)m=x(o.format===be,o.type),w&&(C?n.texStorage2D(e.TEXTURE_2D,1,m,t.width,t.height):n.texImage2D(e.TEXTURE_2D,0,m,t.width,t.height,0,r,p,null));else if(o.isDataTexture)if(y.length>0){C&&w&&n.texStorage2D(e.TEXTURE_2D,E,m,y[0].width,y[0].height);for(let t=0,i=y.length;t<i;t++)h=y[t],C?T&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,h.width,h.height,r,p,h.data):n.texImage2D(e.TEXTURE_2D,t,m,h.width,h.height,0,r,p,h.data);o.generateMipmaps=!1}else C?(w&&n.texStorage2D(e.TEXTURE_2D,E,m,t.width,t.height),T&&ce(o,t,r,p)):n.texImage2D(e.TEXTURE_2D,0,m,t.width,t.height,0,r,p,t.data);else if(o.isCompressedTexture)if(o.isCompressedArrayTexture){C&&w&&n.texStorage3D(e.TEXTURE_2D_ARRAY,E,m,y[0].width,y[0].height,t.depth);for(let i=0,a=y.length;i<a;i++)if(h=y[i],o.format!==1023)if(r!==null)if(C){if(T)if(o.layerUpdates.size>0){let t=bt(h.width,h.height,o.format,o.type);for(let a of o.layerUpdates){let o=h.data.subarray(a*t/h.data.BYTES_PER_ELEMENT,(a+1)*t/h.data.BYTES_PER_ELEMENT);n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,i,0,0,a,h.width,h.height,1,r,o)}o.clearLayerUpdates()}else n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,i,0,0,0,h.width,h.height,t.depth,r,h.data)}else n.compressedTexImage3D(e.TEXTURE_2D_ARRAY,i,m,h.width,h.height,t.depth,0,h.data,0,0);else K(`WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()`);else C?T&&n.texSubImage3D(e.TEXTURE_2D_ARRAY,i,0,0,0,h.width,h.height,t.depth,r,p,h.data):n.texImage3D(e.TEXTURE_2D_ARRAY,i,m,h.width,h.height,t.depth,0,r,p,h.data)}else{C&&w&&n.texStorage2D(e.TEXTURE_2D,E,m,y[0].width,y[0].height);for(let t=0,i=y.length;t<i;t++)h=y[t],o.format===1023?C?T&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,h.width,h.height,r,p,h.data):n.texImage2D(e.TEXTURE_2D,t,m,h.width,h.height,0,r,p,h.data):r===null?K(`WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()`):C?T&&n.compressedTexSubImage2D(e.TEXTURE_2D,t,0,0,h.width,h.height,r,h.data):n.compressedTexImage2D(e.TEXTURE_2D,t,m,h.width,h.height,0,h.data)}else if(o.isDataArrayTexture)if(C){if(w&&n.texStorage3D(e.TEXTURE_2D_ARRAY,E,m,t.width,t.height,t.depth),T)if(o.layerUpdates.size>0){let i=bt(t.width,t.height,o.format,o.type);for(let a of o.layerUpdates){let o=t.data.subarray(a*i/t.data.BYTES_PER_ELEMENT,(a+1)*i/t.data.BYTES_PER_ELEMENT);n.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,a,t.width,t.height,1,r,p,o)}o.clearLayerUpdates()}else n.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,0,t.width,t.height,t.depth,r,p,t.data)}else n.texImage3D(e.TEXTURE_2D_ARRAY,0,m,t.width,t.height,t.depth,0,r,p,t.data);else if(o.isData3DTexture)C?(w&&n.texStorage3D(e.TEXTURE_3D,E,m,t.width,t.height,t.depth),T&&n.texSubImage3D(e.TEXTURE_3D,0,0,0,0,t.width,t.height,t.depth,r,p,t.data)):n.texImage3D(e.TEXTURE_3D,0,m,t.width,t.height,t.depth,0,r,p,t.data);else if(o.isFramebufferTexture){if(w)if(C)n.texStorage2D(e.TEXTURE_2D,E,m,t.width,t.height);else{let i=t.width,a=t.height;for(let t=0;t<E;t++)n.texImage2D(e.TEXTURE_2D,t,m,i,a,0,r,p,null),i>>=1,a>>=1}}else if(o.isHTMLTexture){if(`texElementImage2D`in e){let n=e.canvas;if(n.hasAttribute(`layoutsubtree`)||n.setAttribute(`layoutsubtree`,`true`),t.parentNode!==n){n.appendChild(t),d.add(o),n.onpaint=e=>{let t=e.changedElements;for(let e of d)t.includes(e.image)&&(e.needsUpdate=!0)},n.requestPaint();return}if(e.texElementImage2D.length===3)e.texElementImage2D(e.TEXTURE_2D,e.RGBA8,t);else{let n=e.RGBA,r=e.RGBA,i=e.UNSIGNED_BYTE;e.texElementImage2D(e.TEXTURE_2D,0,n,r,i,t)}e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE)}}else if(y.length>0){if(C&&w){let t=we(y[0]);n.texStorage2D(e.TEXTURE_2D,E,m,t.width,t.height)}for(let t=0,i=y.length;t<i;t++)h=y[t],C?T&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,r,p,h):n.texImage2D(e.TEXTURE_2D,t,m,r,p,h);o.generateMipmaps=!1}else if(C){if(w){let r=we(t);n.texStorage2D(e.TEXTURE_2D,E,m,r.width,r.height)}T&&n.texSubImage2D(e.TEXTURE_2D,0,0,0,r,p,t)}else n.texImage2D(e.TEXTURE_2D,0,m,r,p,t);_(o)&&v(c),f.__version=u.version,o.onUpdate&&o.onUpdate(o)}t.__version=o.version}function ue(t,o,s){if(o.image.length!==6)return;let c=I(t,o),l=o.source;n.bindTexture(e.TEXTURE_CUBE_MAP,t.__webglTexture,e.TEXTURE0+s);let u=r.get(l);if(l.version!==u.__version||c===!0){n.activeTexture(e.TEXTURE0+s);let t=z.getPrimaries(z.workingColorSpace),r=o.colorSpace===``?null:z.getPrimaries(o.colorSpace),d=o.colorSpace===``||t===r?e.NONE:e.BROWSER_DEFAULT_WEBGL;n.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,o.flipY),n.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,o.premultiplyAlpha),n.pixelStorei(e.UNPACK_ALIGNMENT,o.unpackAlignment),n.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,d);let f=o.isCompressedTexture||o.image[0].isCompressedTexture,p=o.image[0]&&o.image[0].isDataTexture,m=[];for(let e=0;e<6;e++)!f&&!p?m[e]=g(o.image[e],!0,i.maxCubemapSize):m[e]=p?o.image[e].image:o.image[e],m[e]=Ce(o,m[e]);let h=m[0],y=a.convert(o.format,o.colorSpace),x=a.convert(o.type),C=b(o.internalFormat,y,x,o.normalized,o.colorSpace),w=o.isVideoTexture!==!0,T=u.__version===void 0||c===!0,E=l.dataReady,D=S(o,h);oe(e.TEXTURE_CUBE_MAP,o);let O;if(f){w&&T&&n.texStorage2D(e.TEXTURE_CUBE_MAP,D,C,h.width,h.height);for(let t=0;t<6;t++){O=m[t].mipmaps;for(let r=0;r<O.length;r++){let i=O[r];o.format===1023?w?E&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,0,0,i.width,i.height,y,x,i.data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,C,i.width,i.height,0,y,x,i.data):y===null?K(`WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()`):w?E&&n.compressedTexSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,0,0,i.width,i.height,y,i.data):n.compressedTexImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,C,i.width,i.height,0,i.data)}}}else{if(O=o.mipmaps,w&&T){O.length>0&&D++;let t=we(m[0]);n.texStorage2D(e.TEXTURE_CUBE_MAP,D,C,t.width,t.height)}for(let t=0;t<6;t++)if(p){w?E&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,0,0,m[t].width,m[t].height,y,x,m[t].data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,C,m[t].width,m[t].height,0,y,x,m[t].data);for(let r=0;r<O.length;r++){let i=O[r].image[t].image;w?E&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,0,0,i.width,i.height,y,x,i.data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,C,i.width,i.height,0,y,x,i.data)}}else{w?E&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,0,0,y,x,m[t]):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,C,y,x,m[t]);for(let r=0;r<O.length;r++){let i=O[r];w?E&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,0,0,y,x,i.image[t]):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,C,y,x,i.image[t])}}}_(o)&&v(e.TEXTURE_CUBE_MAP),u.__version=l.version,o.onUpdate&&o.onUpdate(o)}t.__version=o.version}function de(t,i,o,c,l,u){let d=a.convert(o.format,o.colorSpace),f=a.convert(o.type),p=b(o.internalFormat,d,f,o.normalized,o.colorSpace),m=r.get(i),h=r.get(o);if(h.__renderTarget=i,!m.__hasExternalTextures){let t=Math.max(1,i.width>>u),r=Math.max(1,i.height>>u);l===e.TEXTURE_3D||l===e.TEXTURE_2D_ARRAY?n.texImage3D(l,u,p,t,r,i.depth,0,d,f,null):n.texImage2D(l,u,p,t,r,0,d,f,null)}n.bindFramebuffer(e.FRAMEBUFFER,t),xe(i)?s.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,c,l,h.__webglTexture,0,ye(i)):(l===e.TEXTURE_2D||l>=e.TEXTURE_CUBE_MAP_POSITIVE_X&&l<=e.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&e.framebufferTexture2D(e.FRAMEBUFFER,c,l,h.__webglTexture,u),n.bindFramebuffer(e.FRAMEBUFFER,null)}function fe(t,n,r){if(e.bindRenderbuffer(e.RENDERBUFFER,t),n.depthBuffer){let i=n.depthTexture,a=i&&i.isDepthTexture?i.type:null,o=x(n.stencilBuffer,a),c=n.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;xe(n)?s.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,ye(n),o,n.width,n.height):r?e.renderbufferStorageMultisample(e.RENDERBUFFER,ye(n),o,n.width,n.height):e.renderbufferStorage(e.RENDERBUFFER,o,n.width,n.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,c,e.RENDERBUFFER,t)}else{let t=n.textures;for(let i=0;i<t.length;i++){let o=t[i],c=a.convert(o.format,o.colorSpace),l=a.convert(o.type),u=b(o.internalFormat,c,l,o.normalized,o.colorSpace);xe(n)?s.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,ye(n),u,n.width,n.height):r?e.renderbufferStorageMultisample(e.RENDERBUFFER,ye(n),u,n.width,n.height):e.renderbufferStorage(e.RENDERBUFFER,u,n.width,n.height)}}e.bindRenderbuffer(e.RENDERBUFFER,null)}function L(t,i,o){let c=i.isWebGLCubeRenderTarget===!0;if(n.bindFramebuffer(e.FRAMEBUFFER,t),!(i.depthTexture&&i.depthTexture.isDepthTexture))throw Error(`THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.`);let l=r.get(i.depthTexture);if(l.__renderTarget=i,(!l.__webglTexture||i.depthTexture.image.width!==i.width||i.depthTexture.image.height!==i.height)&&(i.depthTexture.image.width=i.width,i.depthTexture.image.height=i.height,i.depthTexture.needsUpdate=!0),c){if(l.__webglInit===void 0&&(l.__webglInit=!0,i.depthTexture.addEventListener(`dispose`,C)),l.__webglTexture===void 0){l.__webglTexture=e.createTexture(),n.bindTexture(e.TEXTURE_CUBE_MAP,l.__webglTexture),oe(e.TEXTURE_CUBE_MAP,i.depthTexture);let t=a.convert(i.depthTexture.format),r=a.convert(i.depthTexture.type),o;i.depthTexture.format===1026?o=e.DEPTH_COMPONENT24:i.depthTexture.format===1027&&(o=e.DEPTH24_STENCIL8);for(let n=0;n<6;n++)e.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+n,0,o,i.width,i.height,0,t,r,null)}}else M(i.depthTexture,0);let u=l.__webglTexture,d=ye(i),f=c?e.TEXTURE_CUBE_MAP_POSITIVE_X+o:e.TEXTURE_2D,p=i.depthTexture.format===1027?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;if(i.depthTexture.format===1026)xe(i)?s.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,p,f,u,0,d):e.framebufferTexture2D(e.FRAMEBUFFER,p,f,u,0);else if(i.depthTexture.format===1027)xe(i)?s.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,p,f,u,0,d):e.framebufferTexture2D(e.FRAMEBUFFER,p,f,u,0);else throw Error(`THREE.WebGLTextures: Unknown depthTexture format.`)}function pe(t){let i=r.get(t),a=t.isWebGLCubeRenderTarget===!0;if(i.__boundDepthTexture!==t.depthTexture){let e=t.depthTexture;if(i.__depthDisposeCallback&&i.__depthDisposeCallback(),e){let t=()=>{delete i.__boundDepthTexture,delete i.__depthDisposeCallback,e.removeEventListener(`dispose`,t)};e.addEventListener(`dispose`,t),i.__depthDisposeCallback=t}i.__boundDepthTexture=e}if(t.depthTexture&&!i.__autoAllocateDepthBuffer)if(a)for(let e=0;e<6;e++)L(i.__webglFramebuffer[e],t,e);else{let e=t.texture.mipmaps;e&&e.length>0?L(i.__webglFramebuffer[0],t,0):L(i.__webglFramebuffer,t,0)}else if(a){i.__webglDepthbuffer=[];for(let r=0;r<6;r++)if(n.bindFramebuffer(e.FRAMEBUFFER,i.__webglFramebuffer[r]),i.__webglDepthbuffer[r]===void 0)i.__webglDepthbuffer[r]=e.createRenderbuffer(),fe(i.__webglDepthbuffer[r],t,!1);else{let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,a=i.__webglDepthbuffer[r];e.bindRenderbuffer(e.RENDERBUFFER,a),e.framebufferRenderbuffer(e.FRAMEBUFFER,n,e.RENDERBUFFER,a)}}else{let r=t.texture.mipmaps;if(r&&r.length>0?n.bindFramebuffer(e.FRAMEBUFFER,i.__webglFramebuffer[0]):n.bindFramebuffer(e.FRAMEBUFFER,i.__webglFramebuffer),i.__webglDepthbuffer===void 0)i.__webglDepthbuffer=e.createRenderbuffer(),fe(i.__webglDepthbuffer,t,!1);else{let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,r=i.__webglDepthbuffer;e.bindRenderbuffer(e.RENDERBUFFER,r),e.framebufferRenderbuffer(e.FRAMEBUFFER,n,e.RENDERBUFFER,r)}}n.bindFramebuffer(e.FRAMEBUFFER,null)}function R(t,n,i){let a=r.get(t);n!==void 0&&de(a.__webglFramebuffer,t,t.texture,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,0),i!==void 0&&pe(t)}function me(t){let i=t.texture,s=r.get(t),c=r.get(i);t.addEventListener(`dispose`,w);let l=t.textures,u=t.isWebGLCubeRenderTarget===!0,d=l.length>1;if(d||(c.__webglTexture===void 0&&(c.__webglTexture=e.createTexture()),c.__version=i.version,o.memory.textures++),u){s.__webglFramebuffer=[];for(let t=0;t<6;t++)if(i.mipmaps&&i.mipmaps.length>0){s.__webglFramebuffer[t]=[];for(let n=0;n<i.mipmaps.length;n++)s.__webglFramebuffer[t][n]=e.createFramebuffer()}else s.__webglFramebuffer[t]=e.createFramebuffer()}else{if(i.mipmaps&&i.mipmaps.length>0){s.__webglFramebuffer=[];for(let t=0;t<i.mipmaps.length;t++)s.__webglFramebuffer[t]=e.createFramebuffer()}else s.__webglFramebuffer=e.createFramebuffer();if(d)for(let t=0,n=l.length;t<n;t++){let n=r.get(l[t]);n.__webglTexture===void 0&&(n.__webglTexture=e.createTexture(),o.memory.textures++)}if(t.samples>0&&xe(t)===!1){s.__webglMultisampledFramebuffer=e.createFramebuffer(),s.__webglColorRenderbuffer=[],n.bindFramebuffer(e.FRAMEBUFFER,s.__webglMultisampledFramebuffer);for(let n=0;n<l.length;n++){let r=l[n];s.__webglColorRenderbuffer[n]=e.createRenderbuffer(),e.bindRenderbuffer(e.RENDERBUFFER,s.__webglColorRenderbuffer[n]);let i=a.convert(r.format,r.colorSpace),o=a.convert(r.type),c=b(r.internalFormat,i,o,r.normalized,r.colorSpace,t.isXRRenderTarget===!0),u=ye(t);e.renderbufferStorageMultisample(e.RENDERBUFFER,u,c,t.width,t.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+n,e.RENDERBUFFER,s.__webglColorRenderbuffer[n])}e.bindRenderbuffer(e.RENDERBUFFER,null),t.depthBuffer&&(s.__webglDepthRenderbuffer=e.createRenderbuffer(),fe(s.__webglDepthRenderbuffer,t,!0)),n.bindFramebuffer(e.FRAMEBUFFER,null)}}if(u){n.bindTexture(e.TEXTURE_CUBE_MAP,c.__webglTexture),oe(e.TEXTURE_CUBE_MAP,i);for(let n=0;n<6;n++)if(i.mipmaps&&i.mipmaps.length>0)for(let r=0;r<i.mipmaps.length;r++)de(s.__webglFramebuffer[n][r],t,i,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+n,r);else de(s.__webglFramebuffer[n],t,i,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+n,0);_(i)&&v(e.TEXTURE_CUBE_MAP),n.unbindTexture()}else if(d){for(let i=0,a=l.length;i<a;i++){let a=l[i],o=r.get(a),c=e.TEXTURE_2D;(t.isWebGL3DRenderTarget||t.isWebGLArrayRenderTarget)&&(c=t.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),n.bindTexture(c,o.__webglTexture),oe(c,a),de(s.__webglFramebuffer,t,a,e.COLOR_ATTACHMENT0+i,c,0),_(a)&&v(c)}n.unbindTexture()}else{let r=e.TEXTURE_2D;if((t.isWebGL3DRenderTarget||t.isWebGLArrayRenderTarget)&&(r=t.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),n.bindTexture(r,c.__webglTexture),oe(r,i),i.mipmaps&&i.mipmaps.length>0)for(let n=0;n<i.mipmaps.length;n++)de(s.__webglFramebuffer[n],t,i,e.COLOR_ATTACHMENT0,r,n);else de(s.__webglFramebuffer,t,i,e.COLOR_ATTACHMENT0,r,0);_(i)&&v(r),n.unbindTexture()}t.depthBuffer&&pe(t)}function he(e){let t=e.textures;for(let i=0,a=t.length;i<a;i++){let a=t[i];if(_(a)){let t=y(e),i=r.get(a).__webglTexture;n.bindTexture(t,i),v(t),n.unbindTexture()}}}let ge=[],_e=[];function ve(t){if(t.samples>0){if(xe(t)===!1){let i=t.textures,a=t.width,o=t.height,s=e.COLOR_BUFFER_BIT,l=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,u=r.get(t),d=i.length>1;if(d)for(let t=0;t<i.length;t++)n.bindFramebuffer(e.FRAMEBUFFER,u.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.RENDERBUFFER,null),n.bindFramebuffer(e.FRAMEBUFFER,u.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.TEXTURE_2D,null,0);n.bindFramebuffer(e.READ_FRAMEBUFFER,u.__webglMultisampledFramebuffer);let f=t.texture.mipmaps;f&&f.length>0?n.bindFramebuffer(e.DRAW_FRAMEBUFFER,u.__webglFramebuffer[0]):n.bindFramebuffer(e.DRAW_FRAMEBUFFER,u.__webglFramebuffer);for(let n=0;n<i.length;n++){if(t.resolveDepthBuffer&&(t.depthBuffer&&(s|=e.DEPTH_BUFFER_BIT),t.stencilBuffer&&t.resolveStencilBuffer&&(s|=e.STENCIL_BUFFER_BIT)),d){e.framebufferRenderbuffer(e.READ_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.RENDERBUFFER,u.__webglColorRenderbuffer[n]);let t=r.get(i[n]).__webglTexture;e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,t,0)}e.blitFramebuffer(0,0,a,o,0,0,a,o,s,e.NEAREST),c===!0&&(ge.length=0,_e.length=0,ge.push(e.COLOR_ATTACHMENT0+n),t.depthBuffer&&t.resolveDepthBuffer===!1&&(ge.push(l),_e.push(l),e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,_e)),e.invalidateFramebuffer(e.READ_FRAMEBUFFER,ge))}if(n.bindFramebuffer(e.READ_FRAMEBUFFER,null),n.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),d)for(let t=0;t<i.length;t++){n.bindFramebuffer(e.FRAMEBUFFER,u.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.RENDERBUFFER,u.__webglColorRenderbuffer[t]);let a=r.get(i[t]).__webglTexture;n.bindFramebuffer(e.FRAMEBUFFER,u.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.TEXTURE_2D,a,0)}n.bindFramebuffer(e.DRAW_FRAMEBUFFER,u.__webglMultisampledFramebuffer)}else if(t.depthBuffer&&t.resolveDepthBuffer===!1&&c){let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,[n])}}}function ye(e){return Math.min(i.maxSamples,e.samples)}function xe(e){let n=r.get(e);return e.samples>0&&t.has(`WEBGL_multisampled_render_to_texture`)===!0&&n.__useRenderToTexture!==!1}function Se(e){let t=o.render.frame;u.get(e)!==t&&(u.set(e,t),e.update())}function Ce(e,t){let n=e.colorSpace,r=e.format,i=e.type;return e.isCompressedTexture===!0||e.isVideoTexture===!0||n!==`srgb-linear`&&n!==``&&(z.getTransfer(n)===`srgb`?(r!==1023||i!==1009)&&K(`WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType.`):ft(`WebGLTextures: Unsupported texture color space:`,n)),t}function we(e){return typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement?(l.width=e.naturalWidth||e.width,l.height=e.naturalHeight||e.height):typeof VideoFrame<`u`&&e instanceof VideoFrame?(l.width=e.displayWidth,l.height=e.displayHeight):(l.width=e.width,l.height=e.height),l}this.allocateTextureUnit=te,this.resetTextureUnits=k,this.getTextureUnits=A,this.setTextureUnits=j,this.setTexture2D=M,this.setTexture2DArray=re,this.setTexture3D=N,this.setTextureCube=ie,this.rebindTextures=R,this.setupRenderTarget=me,this.updateRenderTargetMipmap=he,this.updateMultisampleRenderTarget=ve,this.setupDepthRenderbuffer=pe,this.setupFrameBufferTexture=de,this.useMultisampledRTT=xe,this.isReversedDepthBuffer=function(){return n.buffers.depth.getReversed()}}function ea(e,t){function n(n,r=``){let i,a=z.getTransfer(r);if(n===1009)return e.UNSIGNED_BYTE;if(n===1017)return e.UNSIGNED_SHORT_4_4_4_4;if(n===1018)return e.UNSIGNED_SHORT_5_5_5_1;if(n===35902)return e.UNSIGNED_INT_5_9_9_9_REV;if(n===35899)return e.UNSIGNED_INT_10F_11F_11F_REV;if(n===1010)return e.BYTE;if(n===1011)return e.SHORT;if(n===1012)return e.UNSIGNED_SHORT;if(n===1013)return e.INT;if(n===1014)return e.UNSIGNED_INT;if(n===1015)return e.FLOAT;if(n===1016)return e.HALF_FLOAT;if(n===1021)return e.ALPHA;if(n===1022)return e.RGB;if(n===1023)return e.RGBA;if(n===1026)return e.DEPTH_COMPONENT;if(n===1027)return e.DEPTH_STENCIL;if(n===1028)return e.RED;if(n===1029)return e.RED_INTEGER;if(n===1030)return e.RG;if(n===1031)return e.RG_INTEGER;if(n===1033)return e.RGBA_INTEGER;if(n===33776||n===33777||n===33778||n===33779)if(a===`srgb`)if(i=t.get(`WEBGL_compressed_texture_s3tc_srgb`),i!==null){if(n===33776)return i.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===33777)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===33778)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===33779)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(i=t.get(`WEBGL_compressed_texture_s3tc`),i!==null){if(n===33776)return i.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===33777)return i.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===33778)return i.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===33779)return i.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===35840||n===35841||n===35842||n===35843)if(i=t.get(`WEBGL_compressed_texture_pvrtc`),i!==null){if(n===35840)return i.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===35841)return i.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===35842)return i.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===35843)return i.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===36196||n===37492||n===37496||n===37488||n===37489||n===37490||n===37491)if(i=t.get(`WEBGL_compressed_texture_etc`),i!==null){if(n===36196||n===37492)return a===`srgb`?i.COMPRESSED_SRGB8_ETC2:i.COMPRESSED_RGB8_ETC2;if(n===37496)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:i.COMPRESSED_RGBA8_ETC2_EAC;if(n===37488)return i.COMPRESSED_R11_EAC;if(n===37489)return i.COMPRESSED_SIGNED_R11_EAC;if(n===37490)return i.COMPRESSED_RG11_EAC;if(n===37491)return i.COMPRESSED_SIGNED_RG11_EAC}else return null;if(n===37808||n===37809||n===37810||n===37811||n===37812||n===37813||n===37814||n===37815||n===37816||n===37817||n===37818||n===37819||n===37820||n===37821)if(i=t.get(`WEBGL_compressed_texture_astc`),i!==null){if(n===37808)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:i.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===37809)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:i.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===37810)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:i.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===37811)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:i.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===37812)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:i.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===37813)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:i.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===37814)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:i.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===37815)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:i.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===37816)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:i.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===37817)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:i.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===37818)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:i.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===37819)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:i.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===37820)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:i.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===37821)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:i.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===36492||n===36494||n===36495)if(i=t.get(`EXT_texture_compression_bptc`),i!==null){if(n===36492)return a===`srgb`?i.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:i.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===36494)return i.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===36495)return i.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===36283||n===36284||n===36285||n===36286)if(i=t.get(`EXT_texture_compression_rgtc`),i!==null){if(n===36283)return i.COMPRESSED_RED_RGTC1_EXT;if(n===36284)return i.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===36285)return i.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===36286)return i.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===1020?e.UNSIGNED_INT_24_8:e[n]===void 0?null:e[n]}return{convert:n}}var ta=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,na=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,ra=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){let n=new ke(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){let t=e.cameras[0].viewport,n=new rt({vertexShader:ta,fragmentShader:na,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new J(new j(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},ia=class extends B{constructor(e,t){super();let n=this,r=null,i=1,a=null,o=`local-floor`,s=1,c=null,l=null,u=null,d=null,f=null,p=null,m=typeof XRWebGLBinding<`u`,h=new ra,g={},_=t.getContextAttributes(),v=null,y=null,b=[],x=[],S=new yt,C=null,w=new Te;w.viewport=new Me;let T=new Te;T.viewport=new Me;let E=[w,T],D=new kt,O=null,k=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(e){let t=b[e];return t===void 0&&(t=new ye,b[e]=t),t.getTargetRaySpace()},this.getControllerGrip=function(e){let t=b[e];return t===void 0&&(t=new ye,b[e]=t),t.getGripSpace()},this.getHand=function(e){let t=b[e];return t===void 0&&(t=new ye,b[e]=t),t.getHandSpace()};function A(e){let t=x.indexOf(e.inputSource);if(t===-1)return;let n=b[t];n!==void 0&&(n.update(e.inputSource,e.frame,c||a),n.dispatchEvent({type:e.type,data:e.inputSource}))}function j(){r.removeEventListener(`select`,A),r.removeEventListener(`selectstart`,A),r.removeEventListener(`selectend`,A),r.removeEventListener(`squeeze`,A),r.removeEventListener(`squeezestart`,A),r.removeEventListener(`squeezeend`,A),r.removeEventListener(`end`,j),r.removeEventListener(`inputsourceschange`,ee);for(let e=0;e<b.length;e++){let t=x[e];t!==null&&(x[e]=null,b[e].disconnect(t))}O=null,k=null,h.reset();for(let e in g)delete g[e];e.setRenderTarget(v),f=null,d=null,u=null,r=null,y=null,F.stop(),n.isPresenting=!1,e.setPixelRatio(C),e.setSize(S.width,S.height,!1),n.dispatchEvent({type:`sessionend`})}this.setFramebufferScaleFactor=function(e){i=e,n.isPresenting===!0&&K(`WebXRManager: Cannot change framebuffer scale while presenting.`)},this.setReferenceSpaceType=function(e){o=e,n.isPresenting===!0&&K(`WebXRManager: Cannot change reference space type while presenting.`)},this.getReferenceSpace=function(){return c||a},this.setReferenceSpace=function(e){c=e},this.getBaseLayer=function(){return d===null?f:d},this.getBinding=function(){return u===null&&m&&(u=new XRWebGLBinding(r,t)),u},this.getFrame=function(){return p},this.getSession=function(){return r},this.setSession=async function(l){if(r=l,r!==null){if(v=e.getRenderTarget(),r.addEventListener(`select`,A),r.addEventListener(`selectstart`,A),r.addEventListener(`selectend`,A),r.addEventListener(`squeeze`,A),r.addEventListener(`squeezestart`,A),r.addEventListener(`squeezeend`,A),r.addEventListener(`end`,j),r.addEventListener(`inputsourceschange`,ee),_.xrCompatible!==!0&&await t.makeXRCompatible(),C=e.getPixelRatio(),e.getSize(S),m&&`createProjectionLayer`in XRWebGLBinding.prototype){let n=null,a=null,o=null;_.depth&&(o=_.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,n=_.stencil?be:le,a=_.stencil?Oe:Ee);let s={colorFormat:t.RGBA8,depthFormat:o,scaleFactor:i};u=this.getBinding(),d=u.createProjectionLayer(s),r.updateRenderState({layers:[d]}),e.setPixelRatio(1),e.setSize(d.textureWidth,d.textureHeight,!1),y=new Pe(d.textureWidth,d.textureHeight,{format:de,type:Bt,depthTexture:new zt(d.textureWidth,d.textureHeight,a,void 0,void 0,void 0,void 0,void 0,void 0,n),stencilBuffer:_.stencil,colorSpace:e.outputColorSpace,samples:_.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1})}else{let n={antialias:_.antialias,alpha:!0,depth:_.depth,stencil:_.stencil,framebufferScaleFactor:i};f=new XRWebGLLayer(r,t,n),r.updateRenderState({baseLayer:f}),e.setPixelRatio(1),e.setSize(f.framebufferWidth,f.framebufferHeight,!1),y=new Pe(f.framebufferWidth,f.framebufferHeight,{format:de,type:Bt,colorSpace:e.outputColorSpace,stencilBuffer:_.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1})}y.isXRRenderTarget=!0,this.setFoveation(s),c=null,a=await r.requestReferenceSpace(o),F.setContext(r),F.start(),n.isPresenting=!0,n.dispatchEvent({type:`sessionstart`})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode},this.getDepthTexture=function(){return h.getDepthTexture()};function ee(e){for(let t=0;t<e.removed.length;t++){let n=e.removed[t],r=x.indexOf(n);r>=0&&(x[r]=null,b[r].disconnect(n))}for(let t=0;t<e.added.length;t++){let n=e.added[t],r=x.indexOf(n);if(r===-1){for(let e=0;e<b.length;e++)if(e>=x.length){x.push(n),r=e;break}else if(x[e]===null){x[e]=n,r=e;break}if(r===-1)break}let i=b[r];i&&i.connect(n)}}let te=new I,ne=new I;function M(e,t,n){te.setFromMatrixPosition(t.matrixWorld),ne.setFromMatrixPosition(n.matrixWorld);let r=te.distanceTo(ne),i=t.projectionMatrix.elements,a=n.projectionMatrix.elements,o=i[14]/(i[10]-1),s=i[14]/(i[10]+1),c=(i[9]+1)/i[5],l=(i[9]-1)/i[5],u=(i[8]-1)/i[0],d=(a[8]+1)/a[0],f=o*u,p=o*d,m=r/(-u+d),h=m*-u;if(t.matrixWorld.decompose(e.position,e.quaternion,e.scale),e.translateX(h),e.translateZ(m),e.matrixWorld.compose(e.position,e.quaternion,e.scale),e.matrixWorldInverse.copy(e.matrixWorld).invert(),i[10]===-1)e.projectionMatrix.copy(t.projectionMatrix),e.projectionMatrixInverse.copy(t.projectionMatrixInverse);else{let t=o+m,n=s+m,i=f-h,a=p+(r-h),u=c*s/n*t,d=l*s/n*t;e.projectionMatrix.makePerspective(i,a,u,d,t,n),e.projectionMatrixInverse.copy(e.projectionMatrix).invert()}}function re(e,t){t===null?e.matrixWorld.copy(e.matrix):e.matrixWorld.multiplyMatrices(t.matrixWorld,e.matrix),e.matrixWorldInverse.copy(e.matrixWorld).invert()}this.updateCamera=function(e){if(r===null)return;let t=e.near,n=e.far;h.texture!==null&&(h.depthNear>0&&(t=h.depthNear),h.depthFar>0&&(n=h.depthFar)),D.near=T.near=w.near=t,D.far=T.far=w.far=n,(O!==D.near||k!==D.far)&&(r.updateRenderState({depthNear:D.near,depthFar:D.far}),O=D.near,k=D.far),D.layers.mask=e.layers.mask|6,w.layers.mask=D.layers.mask&-5,T.layers.mask=D.layers.mask&-3;let i=e.parent,a=D.cameras;re(D,i);for(let e=0;e<a.length;e++)re(a[e],i);a.length===2?M(D,w,T):D.projectionMatrix.copy(w.projectionMatrix),N(e,D,i)};function N(e,t,n){n===null?e.matrix.copy(t.matrixWorld):(e.matrix.copy(n.matrixWorld),e.matrix.invert(),e.matrix.multiply(t.matrixWorld)),e.matrix.decompose(e.position,e.quaternion,e.scale),e.updateMatrixWorld(!0),e.projectionMatrix.copy(t.projectionMatrix),e.projectionMatrixInverse.copy(t.projectionMatrixInverse),e.isPerspectiveCamera&&(e.fov=R*2*Math.atan(1/e.projectionMatrix.elements[5]),e.zoom=1)}this.getCamera=function(){return D},this.getFoveation=function(){if(!(d===null&&f===null))return s},this.setFoveation=function(e){s=e,d!==null&&(d.fixedFoveation=e),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=e)},this.hasDepthSensing=function(){return h.texture!==null},this.getDepthSensingMesh=function(){return h.getMesh(D)},this.getCameraTexture=function(e){return g[e]};let ie=null;function P(t,i){if(l=i.getViewerPose(c||a),p=i,l!==null){let t=l.views;f!==null&&(e.setRenderTargetFramebuffer(y,f.framebuffer),e.setRenderTarget(y));let i=!1;t.length!==D.cameras.length&&(D.cameras.length=0,i=!0);for(let n=0;n<t.length;n++){let r=t[n],a=null;if(f!==null)a=f.getViewport(r);else{let t=u.getViewSubImage(d,r);a=t.viewport,n===0&&(e.setRenderTargetTextures(y,t.colorTexture,t.depthStencilTexture),e.setRenderTarget(y))}let o=E[n];o===void 0&&(o=new Te,o.layers.enable(n),o.viewport=new Me,E[n]=o),o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.quaternion,o.scale),o.projectionMatrix.fromArray(r.projectionMatrix),o.projectionMatrixInverse.copy(o.projectionMatrix).invert(),o.viewport.set(a.x,a.y,a.width,a.height),n===0&&(D.matrix.copy(o.matrix),D.matrix.decompose(D.position,D.quaternion,D.scale)),i===!0&&D.cameras.push(o)}let a=r.enabledFeatures;if(a&&a.includes(`depth-sensing`)&&r.depthUsage==`gpu-optimized`&&m){u=n.getBinding();let e=u.getDepthInformation(t[0]);e&&e.isValid&&e.texture&&h.init(e,r.renderState)}if(a&&a.includes(`camera-access`)&&m){e.state.unbindTexture(),u=n.getBinding();for(let e=0;e<t.length;e++){let n=t[e].camera;if(n){let e=g[n];e||(e=new ke,g[n]=e);let t=u.getCameraImage(n);e.sourceTexture=t}}}}for(let e=0;e<b.length;e++){let t=x[e],n=b[e];t!==null&&n!==void 0&&n.update(t,i,c||a)}ie&&ie(t,i),i.detectedPlanes&&n.dispatchEvent({type:`planesdetected`,data:i}),p=null}let F=new Xt;F.setAnimationLoop(P),this.setAnimationLoop=function(e){ie=e},this.dispose=function(){}}},aa=new We,oa=new q;oa.set(-1,0,0,0,1,0,0,0,1);function sa(e,t){function n(e,t){e.matrixAutoUpdate===!0&&e.updateMatrix(),t.value.copy(e.matrix)}function r(t,n){n.color.getRGB(t.fogColor.value,Ze(e)),n.isFog?(t.fogNear.value=n.near,t.fogFar.value=n.far):n.isFogExp2&&(t.fogDensity.value=n.density)}function i(e,t,n,r,i){t.isNodeMaterial?t.uniformsNeedUpdate=!1:t.isMeshBasicMaterial?a(e,t):t.isMeshLambertMaterial?(a(e,t),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)):t.isMeshToonMaterial?(a(e,t),d(e,t)):t.isMeshPhongMaterial?(a(e,t),u(e,t),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)):t.isMeshStandardMaterial?(a(e,t),f(e,t),t.isMeshPhysicalMaterial&&p(e,t,i)):t.isMeshMatcapMaterial?(a(e,t),m(e,t)):t.isMeshDepthMaterial?a(e,t):t.isMeshDistanceMaterial?(a(e,t),h(e,t)):t.isMeshNormalMaterial?a(e,t):t.isLineBasicMaterial?(o(e,t),t.isLineDashedMaterial&&s(e,t)):t.isPointsMaterial?c(e,t,n,r):t.isSpriteMaterial?l(e,t):t.isShadowMaterial?(e.color.value.copy(t.color),e.opacity.value=t.opacity):t.isShaderMaterial&&(t.uniformsNeedUpdate=!1)}function a(e,r){e.opacity.value=r.opacity,r.color&&e.diffuse.value.copy(r.color),r.emissive&&e.emissive.value.copy(r.emissive).multiplyScalar(r.emissiveIntensity),r.map&&(e.map.value=r.map,n(r.map,e.mapTransform)),r.alphaMap&&(e.alphaMap.value=r.alphaMap,n(r.alphaMap,e.alphaMapTransform)),r.bumpMap&&(e.bumpMap.value=r.bumpMap,n(r.bumpMap,e.bumpMapTransform),e.bumpScale.value=r.bumpScale,r.side===1&&(e.bumpScale.value*=-1)),r.normalMap&&(e.normalMap.value=r.normalMap,n(r.normalMap,e.normalMapTransform),e.normalScale.value.copy(r.normalScale),r.side===1&&e.normalScale.value.negate()),r.displacementMap&&(e.displacementMap.value=r.displacementMap,n(r.displacementMap,e.displacementMapTransform),e.displacementScale.value=r.displacementScale,e.displacementBias.value=r.displacementBias),r.emissiveMap&&(e.emissiveMap.value=r.emissiveMap,n(r.emissiveMap,e.emissiveMapTransform)),r.specularMap&&(e.specularMap.value=r.specularMap,n(r.specularMap,e.specularMapTransform)),r.alphaTest>0&&(e.alphaTest.value=r.alphaTest);let i=t.get(r),a=i.envMap,o=i.envMapRotation;a&&(e.envMap.value=a,e.envMapRotation.value.setFromMatrix4(aa.makeRotationFromEuler(o)).transpose(),a.isCubeTexture&&a.isRenderTargetTexture===!1&&e.envMapRotation.value.premultiply(oa),e.reflectivity.value=r.reflectivity,e.ior.value=r.ior,e.refractionRatio.value=r.refractionRatio),r.lightMap&&(e.lightMap.value=r.lightMap,e.lightMapIntensity.value=r.lightMapIntensity,n(r.lightMap,e.lightMapTransform)),r.aoMap&&(e.aoMap.value=r.aoMap,e.aoMapIntensity.value=r.aoMapIntensity,n(r.aoMap,e.aoMapTransform))}function o(e,t){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,t.map&&(e.map.value=t.map,n(t.map,e.mapTransform))}function s(e,t){e.dashSize.value=t.dashSize,e.totalSize.value=t.dashSize+t.gapSize,e.scale.value=t.scale}function c(e,t,r,i){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,e.size.value=t.size*r,e.scale.value=i*.5,t.map&&(e.map.value=t.map,n(t.map,e.uvTransform)),t.alphaMap&&(e.alphaMap.value=t.alphaMap,n(t.alphaMap,e.alphaMapTransform)),t.alphaTest>0&&(e.alphaTest.value=t.alphaTest)}function l(e,t){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,e.rotation.value=t.rotation,t.map&&(e.map.value=t.map,n(t.map,e.mapTransform)),t.alphaMap&&(e.alphaMap.value=t.alphaMap,n(t.alphaMap,e.alphaMapTransform)),t.alphaTest>0&&(e.alphaTest.value=t.alphaTest)}function u(e,t){e.specular.value.copy(t.specular),e.shininess.value=Math.max(t.shininess,1e-4)}function d(e,t){t.gradientMap&&(e.gradientMap.value=t.gradientMap)}function f(e,t){e.metalness.value=t.metalness,t.metalnessMap&&(e.metalnessMap.value=t.metalnessMap,n(t.metalnessMap,e.metalnessMapTransform)),e.roughness.value=t.roughness,t.roughnessMap&&(e.roughnessMap.value=t.roughnessMap,n(t.roughnessMap,e.roughnessMapTransform)),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)}function p(e,t,r){e.ior.value=t.ior,t.sheen>0&&(e.sheenColor.value.copy(t.sheenColor).multiplyScalar(t.sheen),e.sheenRoughness.value=t.sheenRoughness,t.sheenColorMap&&(e.sheenColorMap.value=t.sheenColorMap,n(t.sheenColorMap,e.sheenColorMapTransform)),t.sheenRoughnessMap&&(e.sheenRoughnessMap.value=t.sheenRoughnessMap,n(t.sheenRoughnessMap,e.sheenRoughnessMapTransform))),t.clearcoat>0&&(e.clearcoat.value=t.clearcoat,e.clearcoatRoughness.value=t.clearcoatRoughness,t.clearcoatMap&&(e.clearcoatMap.value=t.clearcoatMap,n(t.clearcoatMap,e.clearcoatMapTransform)),t.clearcoatRoughnessMap&&(e.clearcoatRoughnessMap.value=t.clearcoatRoughnessMap,n(t.clearcoatRoughnessMap,e.clearcoatRoughnessMapTransform)),t.clearcoatNormalMap&&(e.clearcoatNormalMap.value=t.clearcoatNormalMap,n(t.clearcoatNormalMap,e.clearcoatNormalMapTransform),e.clearcoatNormalScale.value.copy(t.clearcoatNormalScale),t.side===1&&e.clearcoatNormalScale.value.negate())),t.dispersion>0&&(e.dispersion.value=t.dispersion),t.iridescence>0&&(e.iridescence.value=t.iridescence,e.iridescenceIOR.value=t.iridescenceIOR,e.iridescenceThicknessMinimum.value=t.iridescenceThicknessRange[0],e.iridescenceThicknessMaximum.value=t.iridescenceThicknessRange[1],t.iridescenceMap&&(e.iridescenceMap.value=t.iridescenceMap,n(t.iridescenceMap,e.iridescenceMapTransform)),t.iridescenceThicknessMap&&(e.iridescenceThicknessMap.value=t.iridescenceThicknessMap,n(t.iridescenceThicknessMap,e.iridescenceThicknessMapTransform))),t.transmission>0&&(e.transmission.value=t.transmission,e.transmissionSamplerMap.value=r.texture,e.transmissionSamplerSize.value.set(r.width,r.height),t.transmissionMap&&(e.transmissionMap.value=t.transmissionMap,n(t.transmissionMap,e.transmissionMapTransform)),e.thickness.value=t.thickness,t.thicknessMap&&(e.thicknessMap.value=t.thicknessMap,n(t.thicknessMap,e.thicknessMapTransform)),e.attenuationDistance.value=t.attenuationDistance,e.attenuationColor.value.copy(t.attenuationColor)),t.anisotropy>0&&(e.anisotropyVector.value.set(t.anisotropy*Math.cos(t.anisotropyRotation),t.anisotropy*Math.sin(t.anisotropyRotation)),t.anisotropyMap&&(e.anisotropyMap.value=t.anisotropyMap,n(t.anisotropyMap,e.anisotropyMapTransform))),e.specularIntensity.value=t.specularIntensity,e.specularColor.value.copy(t.specularColor),t.specularColorMap&&(e.specularColorMap.value=t.specularColorMap,n(t.specularColorMap,e.specularColorMapTransform)),t.specularIntensityMap&&(e.specularIntensityMap.value=t.specularIntensityMap,n(t.specularIntensityMap,e.specularIntensityMapTransform))}function m(e,t){t.matcap&&(e.matcap.value=t.matcap)}function h(e,n){let r=t.get(n).light;e.referencePosition.value.setFromMatrixPosition(r.matrixWorld),e.nearDistance.value=r.shadow.camera.near,e.farDistance.value=r.shadow.camera.far}return{refreshFogUniforms:r,refreshMaterialUniforms:i}}function ca(e,t,n,r){let i={},a={},o=[],s=e.getParameter(e.MAX_UNIFORM_BUFFER_BINDINGS);function c(e,t){let n=t.program;r.uniformBlockBinding(e,n)}function l(e,n){let o=i[e.id];o===void 0&&(g(e),o=u(e),i[e.id]=o,e.addEventListener(`dispose`,v));let s=n.program;r.updateUBOMapping(e,s);let c=t.render.frame;a[e.id]!==c&&(f(e),a[e.id]=c)}function u(t){let n=d();t.__bindingPointIndex=n;let r=e.createBuffer(),i=t.__size,a=t.usage;return e.bindBuffer(e.UNIFORM_BUFFER,r),e.bufferData(e.UNIFORM_BUFFER,i,a),e.bindBuffer(e.UNIFORM_BUFFER,null),e.bindBufferBase(e.UNIFORM_BUFFER,n,r),r}function d(){for(let e=0;e<s;e++)if(o.indexOf(e)===-1)return o.push(e),e;return ft(`WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached.`),0}function f(t){let n=i[t.id],r=t.uniforms,a=t.__cache;e.bindBuffer(e.UNIFORM_BUFFER,n);for(let e=0,t=r.length;e<t;e++){let t=r[e];if(Array.isArray(t))for(let n=0,r=t.length;n<r;n++)p(t[n],e,n,a);else p(t,e,0,a)}e.bindBuffer(e.UNIFORM_BUFFER,null)}function p(t,n,r,i){if(h(t,n,r,i)===!0){let n=t.__offset,r=t.value;if(Array.isArray(r)){let e=0;for(let n=0;n<r.length;n++){let i=r[n],a=_(i);m(i,t.__data,e),typeof i!=`number`&&typeof i!=`boolean`&&!i.isMatrix3&&!ArrayBuffer.isView(i)&&(e+=a.storage/Float32Array.BYTES_PER_ELEMENT)}}else m(r,t.__data,0);e.bufferSubData(e.UNIFORM_BUFFER,n,t.__data)}}function m(e,t,n){typeof e==`number`||typeof e==`boolean`?t[0]=e:e.isMatrix3?(t[0]=e.elements[0],t[1]=e.elements[1],t[2]=e.elements[2],t[3]=0,t[4]=e.elements[3],t[5]=e.elements[4],t[6]=e.elements[5],t[7]=0,t[8]=e.elements[6],t[9]=e.elements[7],t[10]=e.elements[8],t[11]=0):ArrayBuffer.isView(e)?t.set(new e.constructor(e.buffer,e.byteOffset,t.length)):e.toArray(t,n)}function h(e,t,n,r){let i=e.value,a=t+`_`+n;if(r[a]===void 0)return typeof i==`number`||typeof i==`boolean`?r[a]=i:ArrayBuffer.isView(i)?r[a]=i.slice():r[a]=i.clone(),!0;{let e=r[a];if(typeof i==`number`||typeof i==`boolean`){if(e!==i)return r[a]=i,!0}else if(ArrayBuffer.isView(i))return!0;else if(e.equals(i)===!1)return e.copy(i),!0}return!1}function g(e){let t=e.uniforms,n=0;for(let e=0,r=t.length;e<r;e++){let r=Array.isArray(t[e])?t[e]:[t[e]];for(let e=0,t=r.length;e<t;e++){let t=r[e],i=Array.isArray(t.value)?t.value:[t.value];for(let e=0,r=i.length;e<r;e++){let r=i[e],a=_(r),o=n%16,s=o%a.boundary,c=o+s;n+=s,c!==0&&16-c<a.storage&&(n+=16-c),t.__data=new Float32Array(a.storage/Float32Array.BYTES_PER_ELEMENT),t.__offset=n,n+=a.storage}}}let r=n%16;return r>0&&(n+=16-r),e.__size=n,e.__cache={},this}function _(e){let t={boundary:0,storage:0};return typeof e==`number`||typeof e==`boolean`?(t.boundary=4,t.storage=4):e.isVector2?(t.boundary=8,t.storage=8):e.isVector3||e.isColor?(t.boundary=16,t.storage=12):e.isVector4?(t.boundary=16,t.storage=16):e.isMatrix3?(t.boundary=48,t.storage=48):e.isMatrix4?(t.boundary=64,t.storage=64):e.isTexture?K(`WebGLRenderer: Texture samplers can not be part of an uniforms group.`):ArrayBuffer.isView(e)?(t.boundary=16,t.storage=e.byteLength):K(`WebGLRenderer: Unsupported uniform value type.`,e),t}function v(t){let n=t.target;n.removeEventListener(`dispose`,v);let r=o.indexOf(n.__bindingPointIndex);o.splice(r,1),e.deleteBuffer(i[n.id]),delete i[n.id],delete a[n.id]}function y(){for(let t in i)e.deleteBuffer(i[t]);o=[],i={},a={}}return{bind:c,update:l,dispose:y}}var la=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),ua=null;function da(){return ua===null&&(ua=new F(la,16,16,lt,Ne),ua.name=`DFG_LUT`,ua.minFilter=G,ua.magFilter=G,ua.wrapS=ee,ua.wrapT=ee,ua.generateMipmaps=!1,ua.needsUpdate=!0),ua}var fa=class{constructor(e={}){let{canvas:t=He(),context:n=null,depth:r=!0,stencil:i=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:s=!0,preserveDrawingBuffer:c=!1,powerPreference:l=`default`,failIfMajorPerformanceCaveat:u=!1,reversedDepthBuffer:d=!1,outputBufferType:f=Bt}=e;this.isWebGLRenderer=!0;let p;if(n!==null){if(typeof WebGLRenderingContext<`u`&&n instanceof WebGLRenderingContext)throw Error(`THREE.WebGLRenderer: WebGL 1 is not supported since r163.`);p=n.getContextAttributes().alpha}else p=a;let m=f,h=new Set([Se,Je,At]),g=new Set([Bt,Ee,ce,Oe,Ae,ie]),_=new Uint32Array(4),v=new Int32Array(4),y=new I,b=null,x=null,S=[],C=[],w=null;this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=0,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let T=this,E=!1,D=null,O=null,A=null,j=null;this._outputColorSpace=te;let ee=0,ne=0,M=null,re=-1,N=null,P=new Me,F=new Me,ae=null,se=new k(0),le=0,ue=t.width,de=t.height,fe=1,L=null,pe=null,R=new Me(0,0,ue,de),me=new Me(0,0,ue,de),he=!1,ge=new oe,_e=!1,ve=!1,ye=new We,be=new I,xe=new Me,Ce={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},we=!1;function Te(){return M===null?fe:1}let B=n;function De(e,n){return t.getContext(e,n)}try{let e={alpha:!0,depth:r,stencil:i,antialias:o,premultipliedAlpha:s,preserveDrawingBuffer:c,powerPreference:l,failIfMajorPerformanceCaveat:u};if(`setAttribute`in t&&t.setAttribute(`data-engine`,`three.js r185`),t.addEventListener(`webglcontextlost`,rt,!1),t.addEventListener(`webglcontextrestored`,it,!1),t.addEventListener(`webglcontextcreationerror`,at,!1),B===null){let t=`webgl2`;if(B=De(t,e),B===null)throw De(t)?Error(`THREE.WebGLRenderer: Error creating WebGL context with your selected attributes.`):Error(`THREE.WebGLRenderer: Error creating WebGL context.`)}}catch(e){throw ft(`WebGLRenderer: `+e.message),e}let ke,V,H,U,W,G,Ie,Le,Re,ze,Be,Ve,q,Ue,Ge,Ke,qe,Ye,Xe,Ze,Qe,$e,et;function tt(){ke=new An(B),ke.init(),Qe=new ea(B,ke),V=new on(B,ke,e,Qe),H=new Qi(B,ke),V.reversedDepthBuffer&&d&&H.buffers.depth.setReversed(!0),O=B.createFramebuffer(),A=B.createFramebuffer(),j=B.createFramebuffer(),U=new Nn(B),W=new Mi,G=new $i(B,ke,H,W,V,Qe,U),Ie=new kn(T),Le=new Zt(B),$e=new rn(B,Le),Re=new jn(B,Le,U,$e),ze=new Fn(B,Re,Le,$e,U),Ye=new Pn(B,V,G),Ge=new sn(W),Be=new ji(T,Ie,ke,V,$e,Ge),Ve=new sa(T,W),q=new Ii,Ue=new Ui(ke),qe=new nn(T,Ie,H,ze,p,s),Ke=new Zi(T,ze,V),et=new ca(B,U,V,H),Xe=new an(B,ke,U),Ze=new Mn(B,ke,U),U.programs=Be.programs,T.capabilities=V,T.extensions=ke,T.properties=W,T.renderLists=q,T.shadowMap=Ke,T.state=H,T.info=U}tt(),m!==1009&&(w=new Ln(m,t.width,t.height,o,r,i));let nt=new ia(T,B);this.xr=nt,this.getContext=function(){return B},this.getContextAttributes=function(){return B.getContextAttributes()},this.forceContextLoss=function(){let e=ke.get(`WEBGL_lose_context`);e&&e.loseContext()},this.forceContextRestore=function(){let e=ke.get(`WEBGL_lose_context`);e&&e.restoreContext()},this.getPixelRatio=function(){return fe},this.setPixelRatio=function(e){e!==void 0&&(fe=e,this.setSize(ue,de,!1))},this.getSize=function(e){return e.set(ue,de)},this.setSize=function(e,n,r=!0){if(nt.isPresenting){K(`WebGLRenderer: Can't change size while VR device is presenting.`);return}ue=e,de=n,t.width=Math.floor(e*fe),t.height=Math.floor(n*fe),r===!0&&(t.style.width=e+`px`,t.style.height=n+`px`),w!==null&&w.setSize(t.width,t.height),this.setViewport(0,0,e,n)},this.getDrawingBufferSize=function(e){return e.set(ue*fe,de*fe).floor()},this.setDrawingBufferSize=function(e,n,r){ue=e,de=n,fe=r,t.width=Math.floor(e*r),t.height=Math.floor(n*r),this.setViewport(0,0,e,n)},this.setEffects=function(e){if(m===1009){ft(`WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.`);return}if(e){for(let t=0;t<e.length;t++)if(e[t].isOutputPass===!0){K(`WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.`);break}}w.setEffects(e||[])},this.getCurrentViewport=function(e){return e.copy(P)},this.getViewport=function(e){return e.copy(R)},this.setViewport=function(e,t,n,r){e.isVector4?R.set(e.x,e.y,e.z,e.w):R.set(e,t,n,r),H.viewport(P.copy(R).multiplyScalar(fe).round())},this.getScissor=function(e){return e.copy(me)},this.setScissor=function(e,t,n,r){e.isVector4?me.set(e.x,e.y,e.z,e.w):me.set(e,t,n,r),H.scissor(F.copy(me).multiplyScalar(fe).round())},this.getScissorTest=function(){return he},this.setScissorTest=function(e){H.setScissorTest(he=e)},this.setOpaqueSort=function(e){L=e},this.setTransparentSort=function(e){pe=e},this.getClearColor=function(e){return e.copy(qe.getClearColor())},this.setClearColor=function(){qe.setClearColor(...arguments)},this.getClearAlpha=function(){return qe.getClearAlpha()},this.setClearAlpha=function(){qe.setClearAlpha(...arguments)},this.clear=function(e=!0,t=!0,n=!0){let r=0;if(e){let e=!1;if(M!==null){let t=M.texture.format;e=h.has(t)}if(e){let e=M.texture.type,t=g.has(e),n=qe.getClearColor(),r=qe.getClearAlpha(),i=n.r,a=n.g,o=n.b;t?(_[0]=i,_[1]=a,_[2]=o,_[3]=r,B.clearBufferuiv(B.COLOR,0,_)):(v[0]=i,v[1]=a,v[2]=o,v[3]=r,B.clearBufferiv(B.COLOR,0,v))}else r|=B.COLOR_BUFFER_BIT}t&&(r|=B.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),n&&(r|=B.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),r!==0&&B.clear(r)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(e){e.setRenderer(this),D=e},this.dispose=function(){t.removeEventListener(`webglcontextlost`,rt,!1),t.removeEventListener(`webglcontextrestored`,it,!1),t.removeEventListener(`webglcontextcreationerror`,at,!1),qe.dispose(),q.dispose(),Ue.dispose(),W.dispose(),Ie.dispose(),ze.dispose(),$e.dispose(),et.dispose(),Be.dispose(),nt.dispose(),nt.removeEventListener(`sessionstart`,pt),nt.removeEventListener(`sessionend`,mt),ht.stop()};function rt(e){e.preventDefault(),Fe(`WebGLRenderer: Context Lost.`),E=!0}function it(){Fe(`WebGLRenderer: Context Restored.`),E=!1;let e=U.autoReset,t=Ke.enabled,n=Ke.autoUpdate,r=Ke.needsUpdate,i=Ke.type;tt(),U.autoReset=e,Ke.enabled=t,Ke.autoUpdate=n,Ke.needsUpdate=r,Ke.type=i}function at(e){ft(`WebGLRenderer: A WebGL context could not be created. Reason: `,e.statusMessage)}function ot(e){let t=e.target;t.removeEventListener(`dispose`,ot),st(t)}function st(e){ct(e),W.remove(e)}function ct(e){let t=W.get(e).programs;t!==void 0&&(t.forEach(function(e){Be.releaseProgram(e)}),e.isShaderMaterial&&Be.releaseShaderCache(e))}this.renderBufferDirect=function(e,t,n,r,i,a){t===null&&(t=Ce);let o=i.isMesh&&i.matrixWorld.determinantAffine()<0,s=Et(e,t,n,r,i);H.setMaterial(r,o);let c=n.index,l=1;if(r.wireframe===!0){if(c=Re.getWireframeAttribute(n),c===void 0)return;l=2}let u=n.drawRange,d=n.attributes.position,f=u.start*l,p=(u.start+u.count)*l;a!==null&&(f=Math.max(f,a.start*l),p=Math.min(p,(a.start+a.count)*l)),c===null?d!=null&&(f=Math.max(f,0),p=Math.min(p,d.count)):(f=Math.max(f,0),p=Math.min(p,c.count));let m=p-f;if(m<0||m===1/0)return;$e.setup(i,r,s,n,c);let h,g=Xe;if(c!==null&&(h=Le.get(c),g=Ze,g.setIndex(h)),i.isMesh)r.wireframe===!0?(H.setLineWidth(r.wireframeLinewidth*Te()),g.setMode(B.LINES)):g.setMode(B.TRIANGLES);else if(i.isLine){let e=r.linewidth;e===void 0&&(e=1),H.setLineWidth(e*Te()),i.isLineSegments?g.setMode(B.LINES):i.isLineLoop?g.setMode(B.LINE_LOOP):g.setMode(B.LINE_STRIP)}else i.isPoints?g.setMode(B.POINTS):i.isSprite&&g.setMode(B.TRIANGLES);if(i.isBatchedMesh)if(ke.get(`WEBGL_multi_draw`))g.renderMultiDraw(i._multiDrawStarts,i._multiDrawCounts,i._multiDrawCount);else{let e=i._multiDrawStarts,t=i._multiDrawCounts,n=i._multiDrawCount,a=c?Le.get(c).bytesPerElement:1,o=W.get(r).currentProgram.getUniforms();for(let r=0;r<n;r++)o.setValue(B,`_gl_DrawID`,r),g.render(e[r]/a,t[r])}else if(i.isInstancedMesh)g.renderInstances(f,m,i.count);else if(n.isInstancedBufferGeometry){let e=n._maxInstanceCount===void 0?1/0:n._maxInstanceCount,t=Math.min(n.instanceCount,e);g.renderInstances(f,m,t)}else g.render(f,m)};function lt(e,t,n){e.transparent===!0&&e.side===2&&e.forceSinglePass===!1?(e.side=1,e.needsUpdate=!0,xt(e,t,n),e.side=0,e.needsUpdate=!0,xt(e,t,n),e.side=2):xt(e,t,n)}this.compile=function(e,t,n=null){n===null&&(n=e),x=Ue.get(n),x.init(t),C.push(x),n.traverseVisible(function(e){e.isLight&&e.layers.test(t.layers)&&(x.pushLight(e),e.castShadow&&x.pushShadow(e))}),e!==n&&e.traverseVisible(function(e){e.isLight&&e.layers.test(t.layers)&&(x.pushLight(e),e.castShadow&&x.pushShadow(e))}),x.setupLights();let r=new Set;return e.traverse(function(e){if(!(e.isMesh||e.isPoints||e.isLine||e.isSprite))return;let t=e.material;if(t)if(Array.isArray(t))for(let i=0;i<t.length;i++){let a=t[i];lt(a,n,e),r.add(a)}else lt(t,n,e),r.add(t)}),x=C.pop(),r},this.compileAsync=function(e,t,n=null){let r=this.compile(e,t,n);return new Promise(t=>{function n(){if(r.forEach(function(e){W.get(e).currentProgram.isReady()&&r.delete(e)}),r.size===0){t(e);return}setTimeout(n,10)}ke.get(`KHR_parallel_shader_compile`)===null?setTimeout(n,10):n()})};let ut=null;function dt(e){ut&&ut(e)}function pt(){ht.stop()}function mt(){ht.start()}let ht=new Xt;ht.setAnimationLoop(dt),typeof self<`u`&&ht.setContext(self),this.setAnimationLoop=function(e){ut=e,nt.setAnimationLoop(e),e===null?ht.stop():ht.start()},nt.addEventListener(`sessionstart`,pt),nt.addEventListener(`sessionend`,mt),this.render=function(e,t){if(t!==void 0&&t.isCamera!==!0){ft(`WebGLRenderer.render: camera is not an instance of THREE.Camera.`);return}if(E===!0)return;D!==null&&D.renderStart(e,t);let n=nt.enabled===!0&&nt.isPresenting===!0,r=w!==null&&(M===null||n)&&w.begin(T,M);if(e.matrixWorldAutoUpdate===!0&&e.updateMatrixWorld(),t.parent===null&&t.matrixWorldAutoUpdate===!0&&t.updateMatrixWorld(),nt.enabled===!0&&nt.isPresenting===!0&&(w===null||w.isCompositing()===!1)&&(nt.cameraAutoUpdate===!0&&nt.updateCamera(t),t=nt.getCamera()),e.isScene===!0&&e.onBeforeRender(T,e,t,M),x=Ue.get(e,C.length),x.init(t),x.state.textureUnits=G.getTextureUnits(),C.push(x),ye.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),ge.setFromProjectionMatrix(ye,je,t.reversedDepth),ve=this.localClippingEnabled,_e=Ge.init(this.clippingPlanes,ve),b=q.get(e,S.length),b.init(),S.push(b),nt.enabled===!0&&nt.isPresenting===!0){let e=T.xr.getDepthSensingMesh();e!==null&&_t(e,t,-1/0,T.sortObjects)}_t(e,t,0,T.sortObjects),b.finish(),T.sortObjects===!0&&b.sort(L,pe,t.reversedDepth),we=nt.enabled===!1||nt.isPresenting===!1||nt.hasDepthSensing()===!1,we&&qe.addToRenderList(b,e),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),_e===!0&&Ge.beginShadows();let i=x.state.shadowsArray;if(Ke.render(i,e,t),_e===!0&&Ge.endShadows(),(r&&w.hasRenderPass())===!1){let n=b.opaque,r=b.transmissive;if(x.setupLights(),t.isArrayCamera){let i=t.cameras;if(r.length>0)for(let t=0,a=i.length;t<a;t++){let a=i[t];vt(n,r,e,a)}we&&qe.render(e);for(let t=0,n=i.length;t<n;t++){let n=i[t];J(b,e,n,n.viewport)}}else r.length>0&&vt(n,r,e,t),we&&qe.render(e),J(b,e,t)}M!==null&&ne===0&&(G.updateMultisampleRenderTarget(M),G.updateRenderTargetMipmap(M)),r&&w.end(T),e.isScene===!0&&e.onAfterRender(T,e,t),$e.resetDefaultState(),re=-1,N=null,C.pop(),C.length>0?(x=C[C.length-1],G.setTextureUnits(x.state.textureUnits),_e===!0&&Ge.setGlobalState(T.clippingPlanes,x.state.camera)):x=null,S.pop(),b=S.length>0?S[S.length-1]:null,D!==null&&D.renderEnd()};function _t(e,t,n,r){if(e.visible===!1)return;if(e.layers.test(t.layers)){if(e.isGroup)n=e.renderOrder;else if(e.isLOD)e.autoUpdate===!0&&e.update(t);else if(e.isLightProbeGrid)x.pushLightProbeGrid(e);else if(e.isLight)x.pushLight(e),e.castShadow&&x.pushShadow(e);else if(e.isSprite){if(!e.frustumCulled||ge.intersectsSprite(e)){r&&xe.setFromMatrixPosition(e.matrixWorld).applyMatrix4(ye);let t=ze.update(e),i=e.material;i.visible&&b.push(e,t,i,n,xe.z,null)}}else if((e.isMesh||e.isLine||e.isPoints)&&(!e.frustumCulled||ge.intersectsObject(e))){let t=ze.update(e),i=e.material;if(r&&(e.boundingSphere===void 0?(t.boundingSphere===null&&t.computeBoundingSphere(),xe.copy(t.boundingSphere.center)):(e.boundingSphere===null&&e.computeBoundingSphere(),xe.copy(e.boundingSphere.center)),xe.applyMatrix4(e.matrixWorld).applyMatrix4(ye)),Array.isArray(i)){let r=t.groups;for(let a=0,o=r.length;a<o;a++){let o=r[a],s=i[o.materialIndex];s&&s.visible&&b.push(e,t,s,n,xe.z,o)}}else i.visible&&b.push(e,t,i,n,xe.z,null)}}let i=e.children;for(let e=0,a=i.length;e<a;e++)_t(i[e],t,n,r)}function J(e,t,n,r){let{opaque:i,transmissive:a,transparent:o}=e;x.setupLightsView(n),_e===!0&&Ge.setGlobalState(T.clippingPlanes,n),r&&H.viewport(P.copy(r)),i.length>0&&yt(i,t,n),a.length>0&&yt(a,t,n),o.length>0&&yt(o,t,n),H.buffers.depth.setTest(!0),H.buffers.depth.setMask(!0),H.buffers.color.setMask(!0),H.setPolygonOffset(!1)}function vt(e,t,n,r){if((n.isScene===!0?n.overrideMaterial:null)!==null)return;if(x.state.transmissionRenderTarget[r.id]===void 0){let e=ke.has(`EXT_color_buffer_half_float`)||ke.has(`EXT_color_buffer_float`);x.state.transmissionRenderTarget[r.id]=new Pe(1,1,{generateMipmaps:!0,type:e?Ne:Bt,minFilter:gt,samples:Math.max(4,V.samples),stencilBuffer:i,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:z.workingColorSpace})}let a=x.state.transmissionRenderTarget[r.id],o=r.viewport||P;a.setSize(o.z*T.transmissionResolutionScale,o.w*T.transmissionResolutionScale);let s=T.getRenderTarget(),c=T.getActiveCubeFace(),l=T.getActiveMipmapLevel();T.setRenderTarget(a),T.getClearColor(se),le=T.getClearAlpha(),le<1&&T.setClearColor(16777215,.5),T.clear(),we&&qe.render(n);let u=T.toneMapping;T.toneMapping=0;let d=r.viewport;if(r.viewport!==void 0&&(r.viewport=void 0),x.setupLightsView(r),_e===!0&&Ge.setGlobalState(T.clippingPlanes,r),yt(e,n,r),G.updateMultisampleRenderTarget(a),G.updateRenderTargetMipmap(a),ke.has(`WEBGL_multisampled_render_to_texture`)===!1){let e=!1;for(let i=0,a=t.length;i<a;i++){let{object:a,geometry:o,material:s,group:c}=t[i];if(s.side===2&&a.layers.test(r.layers)){let t=s.side;s.side=1,s.needsUpdate=!0,bt(a,n,r,o,s,c),s.side=t,s.needsUpdate=!0,e=!0}}e===!0&&(G.updateMultisampleRenderTarget(a),G.updateRenderTargetMipmap(a))}T.setRenderTarget(s,c,l),T.setClearColor(se,le),d!==void 0&&(r.viewport=d),T.toneMapping=u}function yt(e,t,n){let r=t.isScene===!0?t.overrideMaterial:null;for(let i=0,a=e.length;i<a;i++){let a=e[i],{object:o,geometry:s,group:c}=a,l=a.material;l.allowOverride===!0&&r!==null&&(l=r),o.layers.test(n.layers)&&bt(o,t,n,s,l,c)}}function bt(e,t,n,r,i,a){e.onBeforeRender(T,t,n,r,i,a),e.modelViewMatrix.multiplyMatrices(n.matrixWorldInverse,e.matrixWorld),e.normalMatrix.getNormalMatrix(e.modelViewMatrix),i.onBeforeRender(T,t,n,r,e,a),i.transparent===!0&&i.side===2&&i.forceSinglePass===!1?(i.side=1,i.needsUpdate=!0,T.renderBufferDirect(n,t,r,i,e,a),i.side=0,i.needsUpdate=!0,T.renderBufferDirect(n,t,r,i,e,a),i.side=2):T.renderBufferDirect(n,t,r,i,e,a),e.onAfterRender(T,t,n,r,i,a)}function xt(e,t,n){t.isScene!==!0&&(t=Ce);let r=W.get(e),i=x.state.lights,a=x.state.shadowsArray,o=i.state.version,s=Be.getParameters(e,i.state,a,t,n,x.state.lightProbeGridArray),c=Be.getProgramCacheKey(s),l=r.programs;r.environment=e.isMeshStandardMaterial||e.isMeshLambertMaterial||e.isMeshPhongMaterial?t.environment:null,r.fog=t.fog;let u=e.isMeshStandardMaterial||e.isMeshLambertMaterial&&!e.envMap||e.isMeshPhongMaterial&&!e.envMap;r.envMap=Ie.get(e.envMap||r.environment,u),r.envMapRotation=r.environment!==null&&e.envMap===null?t.environmentRotation:e.envMapRotation,l===void 0&&(e.addEventListener(`dispose`,ot),l=new Map,r.programs=l);let d=l.get(c);if(d!==void 0){if(r.currentProgram===d&&r.lightsStateVersion===o)return wt(e,s),d}else s.uniforms=Be.getUniforms(e),D!==null&&e.isNodeMaterial&&D.build(e,n,s),e.onBeforeCompile(s,T),d=Be.acquireProgram(s,c),l.set(c,d),r.uniforms=s.uniforms;let f=r.uniforms;return(!e.isShaderMaterial&&!e.isRawShaderMaterial||e.clipping===!0)&&(f.clippingPlanes=Ge.uniform),wt(e,s),r.needsLights=Ot(e),r.lightsStateVersion=o,r.needsLights&&(f.ambientLightColor.value=i.state.ambient,f.lightProbe.value=i.state.probe,f.directionalLights.value=i.state.directional,f.directionalLightShadows.value=i.state.directionalShadow,f.spotLights.value=i.state.spot,f.spotLightShadows.value=i.state.spotShadow,f.rectAreaLights.value=i.state.rectArea,f.ltc_1.value=i.state.rectAreaLTC1,f.ltc_2.value=i.state.rectAreaLTC2,f.pointLights.value=i.state.point,f.pointLightShadows.value=i.state.pointShadow,f.hemisphereLights.value=i.state.hemi,f.directionalShadowMatrix.value=i.state.directionalShadowMatrix,f.spotLightMatrix.value=i.state.spotLightMatrix,f.spotLightMap.value=i.state.spotLightMap,f.pointShadowMatrix.value=i.state.pointShadowMatrix),r.lightProbeGrid=x.state.lightProbeGridArray.length>0,r.currentProgram=d,r.uniformsList=null,d}function St(e){if(e.uniformsList===null){let t=e.currentProgram.getUniforms();e.uniformsList=Wr.seqWithValue(t.seq,e.uniforms)}return e.uniformsList}function wt(e,t){let n=W.get(e);n.outputColorSpace=t.outputColorSpace,n.batching=t.batching,n.batchingColor=t.batchingColor,n.instancing=t.instancing,n.instancingColor=t.instancingColor,n.instancingMorph=t.instancingMorph,n.skinning=t.skinning,n.morphTargets=t.morphTargets,n.morphNormals=t.morphNormals,n.morphColors=t.morphColors,n.morphTargetsCount=t.morphTargetsCount,n.numClippingPlanes=t.numClippingPlanes,n.numIntersection=t.numClipIntersection,n.vertexAlphas=t.vertexAlphas,n.vertexTangents=t.vertexTangents,n.toneMapping=t.toneMapping}function Tt(e,t){if(e.length===0)return null;if(e.length===1)return e[0].texture===null?null:e[0];y.setFromMatrixPosition(t.matrixWorld);for(let t=0,n=e.length;t<n;t++){let n=e[t];if(n.texture!==null&&n.boundingBox.containsPoint(y))return n}return null}function Et(e,t,n,r,i){t.isScene!==!0&&(t=Ce),G.resetTextureUnits();let a=t.fog,o=r.isMeshStandardMaterial||r.isMeshLambertMaterial||r.isMeshPhongMaterial?t.environment:null,s=M===null?T.outputColorSpace:M.isXRRenderTarget===!0?M.texture.colorSpace:z.workingColorSpace,c=r.isMeshStandardMaterial||r.isMeshLambertMaterial&&!r.envMap||r.isMeshPhongMaterial&&!r.envMap,l=Ie.get(r.envMap||o,c),u=r.vertexColors===!0&&!!n.attributes.color&&n.attributes.color.itemSize===4,d=!!n.attributes.tangent&&(!!r.normalMap||r.anisotropy>0),f=!!n.morphAttributes.position,p=!!n.morphAttributes.normal,m=!!n.morphAttributes.color,h=0;r.toneMapped&&(M===null||M.isXRRenderTarget===!0)&&(h=T.toneMapping);let g=n.morphAttributes.position||n.morphAttributes.normal||n.morphAttributes.color,_=g===void 0?0:g.length,v=W.get(r),y=x.state.lights;if(_e===!0&&(ve===!0||e!==N)){let t=e===N&&r.id===re;Ge.setState(r,e,t)}let b=!1;r.version===v.__version?v.needsLights&&v.lightsStateVersion!==y.state.version?b=!0:v.outputColorSpace===s?i.isBatchedMesh&&v.batching===!1||!i.isBatchedMesh&&v.batching===!0||i.isBatchedMesh&&v.batchingColor===!0&&i.colorTexture===null||i.isBatchedMesh&&v.batchingColor===!1&&i.colorTexture!==null||i.isInstancedMesh&&v.instancing===!1||!i.isInstancedMesh&&v.instancing===!0||i.isSkinnedMesh&&v.skinning===!1||!i.isSkinnedMesh&&v.skinning===!0||i.isInstancedMesh&&v.instancingColor===!0&&i.instanceColor===null||i.isInstancedMesh&&v.instancingColor===!1&&i.instanceColor!==null||i.isInstancedMesh&&v.instancingMorph===!0&&i.morphTexture===null||i.isInstancedMesh&&v.instancingMorph===!1&&i.morphTexture!==null?b=!0:v.envMap===l?r.fog===!0&&v.fog!==a||v.numClippingPlanes!==void 0&&(v.numClippingPlanes!==Ge.numPlanes||v.numIntersection!==Ge.numIntersection)?b=!0:v.vertexAlphas===u&&v.vertexTangents===d&&v.morphTargets===f&&v.morphNormals===p&&v.morphColors===m&&v.toneMapping===h&&v.morphTargetsCount===_?!!v.lightProbeGrid!=x.state.lightProbeGridArray.length>0&&(b=!0):b=!0:b=!0:b=!0:(b=!0,v.__version=r.version);let S=v.currentProgram;b===!0&&(S=xt(r,t,i),D&&r.isNodeMaterial&&D.onUpdateProgram(r,S,v));let C=!1,w=!1,E=!1,O=S.getUniforms(),k=v.uniforms;if(H.useProgram(S.program)&&(C=!0,w=!0,E=!0),r.id!==re&&(re=r.id,w=!0),v.needsLights){let e=Tt(x.state.lightProbeGridArray,i);v.lightProbeGrid!==e&&(v.lightProbeGrid=e,w=!0)}if(C||N!==e){H.buffers.depth.getReversed()&&e.reversedDepth!==!0&&(e._reversedDepth=!0,e.updateProjectionMatrix()),O.setValue(B,`projectionMatrix`,e.projectionMatrix),O.setValue(B,`viewMatrix`,e.matrixWorldInverse);let t=O.map.cameraPosition;t!==void 0&&t.setValue(B,be.setFromMatrixPosition(e.matrixWorld)),V.logarithmicDepthBuffer&&O.setValue(B,`logDepthBufFC`,2/(Math.log(e.far+1)/Math.LN2)),(r.isMeshPhongMaterial||r.isMeshToonMaterial||r.isMeshLambertMaterial||r.isMeshBasicMaterial||r.isMeshStandardMaterial||r.isShaderMaterial)&&O.setValue(B,`isOrthographic`,e.isOrthographicCamera===!0),N!==e&&(N=e,w=!0,E=!0)}if(v.needsLights&&(y.state.directionalShadowMap.length>0&&O.setValue(B,`directionalShadowMap`,y.state.directionalShadowMap,G),y.state.spotShadowMap.length>0&&O.setValue(B,`spotShadowMap`,y.state.spotShadowMap,G),y.state.pointShadowMap.length>0&&O.setValue(B,`pointShadowMap`,y.state.pointShadowMap,G)),i.isSkinnedMesh){O.setOptional(B,i,`bindMatrix`),O.setOptional(B,i,`bindMatrixInverse`);let e=i.skeleton;e&&(e.boneTexture===null&&e.computeBoneTexture(),O.setValue(B,`boneTexture`,e.boneTexture,G))}i.isBatchedMesh&&(O.setOptional(B,i,`batchingTexture`),O.setValue(B,`batchingTexture`,i._matricesTexture,G),O.setOptional(B,i,`batchingIdTexture`),O.setValue(B,`batchingIdTexture`,i._indirectTexture,G),O.setOptional(B,i,`batchingColorTexture`),i._colorsTexture!==null&&O.setValue(B,`batchingColorTexture`,i._colorsTexture,G));let A=n.morphAttributes;if((A.position!==void 0||A.normal!==void 0||A.color!==void 0)&&Ye.update(i,n,S),(w||v.receiveShadow!==i.receiveShadow)&&(v.receiveShadow=i.receiveShadow,O.setValue(B,`receiveShadow`,i.receiveShadow)),(r.isMeshStandardMaterial||r.isMeshLambertMaterial||r.isMeshPhongMaterial)&&r.envMap===null&&t.environment!==null&&(k.envMapIntensity.value=t.environmentIntensity),k.dfgLUT!==void 0&&(k.dfgLUT.value=da()),w){if(O.setValue(B,`toneMappingExposure`,T.toneMappingExposure),v.needsLights&&Dt(k,E),a&&r.fog===!0&&Ve.refreshFogUniforms(k,a),Ve.refreshMaterialUniforms(k,r,fe,de,x.state.transmissionRenderTarget[e.id]),v.needsLights&&v.lightProbeGrid){let e=v.lightProbeGrid;k.probesSH.value=e.texture,k.probesMin.value.copy(e.boundingBox.min),k.probesMax.value.copy(e.boundingBox.max),k.probesResolution.value.copy(e.resolution)}Wr.upload(B,St(v),k,G)}if(r.isShaderMaterial&&r.uniformsNeedUpdate===!0&&(Wr.upload(B,St(v),k,G),r.uniformsNeedUpdate=!1),r.isSpriteMaterial&&O.setValue(B,`center`,i.center),O.setValue(B,`modelViewMatrix`,i.modelViewMatrix),O.setValue(B,`normalMatrix`,i.normalMatrix),O.setValue(B,`modelMatrix`,i.matrixWorld),r.uniformsGroups!==void 0){let e=r.uniformsGroups;for(let t=0,n=e.length;t<n;t++){let n=e[t];et.update(n,S),et.bind(n,S)}}return S}function Dt(e,t){e.ambientLightColor.needsUpdate=t,e.lightProbe.needsUpdate=t,e.directionalLights.needsUpdate=t,e.directionalLightShadows.needsUpdate=t,e.pointLights.needsUpdate=t,e.pointLightShadows.needsUpdate=t,e.spotLights.needsUpdate=t,e.spotLightShadows.needsUpdate=t,e.rectAreaLights.needsUpdate=t,e.hemisphereLights.needsUpdate=t}function Ot(e){return e.isMeshLambertMaterial||e.isMeshToonMaterial||e.isMeshPhongMaterial||e.isMeshStandardMaterial||e.isShadowMaterial||e.isShaderMaterial&&e.lights===!0}this.getActiveCubeFace=function(){return ee},this.getActiveMipmapLevel=function(){return ne},this.getRenderTarget=function(){return M},this.setRenderTargetTextures=function(e,t,n){let r=W.get(e);r.__autoAllocateDepthBuffer=e.resolveDepthBuffer===!1,r.__autoAllocateDepthBuffer===!1&&(r.__useRenderToTexture=!1),W.get(e.texture).__webglTexture=t,W.get(e.depthTexture).__webglTexture=r.__autoAllocateDepthBuffer?void 0:n,r.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(e,t){let n=W.get(e);n.__webglFramebuffer=t,n.__useDefaultFramebuffer=t===void 0},this.setRenderTarget=function(e,t=0,n=0){M=e,ee=t,ne=n;let r=null,i=!1,a=!1;if(e){let o=W.get(e);if(o.__useDefaultFramebuffer!==void 0){H.bindFramebuffer(B.FRAMEBUFFER,o.__webglFramebuffer),P.copy(e.viewport),F.copy(e.scissor),ae=e.scissorTest,H.viewport(P),H.scissor(F),H.setScissorTest(ae),re=-1;return}else if(o.__webglFramebuffer===void 0)G.setupRenderTarget(e);else if(o.__hasExternalTextures)G.rebindTextures(e,W.get(e.texture).__webglTexture,W.get(e.depthTexture).__webglTexture);else if(e.depthBuffer){let t=e.depthTexture;if(o.__boundDepthTexture!==t){if(t!==null&&W.has(t)&&(e.width!==t.image.width||e.height!==t.image.height))throw Error(`THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.`);G.setupDepthRenderbuffer(e)}}let s=e.texture;(s.isData3DTexture||s.isDataArrayTexture||s.isCompressedArrayTexture)&&(a=!0);let c=W.get(e).__webglFramebuffer;e.isWebGLCubeRenderTarget?(r=Array.isArray(c[t])?c[t][n]:c[t],i=!0):r=e.samples>0&&G.useMultisampledRTT(e)===!1?W.get(e).__webglMultisampledFramebuffer:Array.isArray(c)?c[n]:c,P.copy(e.viewport),F.copy(e.scissor),ae=e.scissorTest}else P.copy(R).multiplyScalar(fe).floor(),F.copy(me).multiplyScalar(fe).floor(),ae=he;if(n!==0&&(r=O),H.bindFramebuffer(B.FRAMEBUFFER,r)&&H.drawBuffers(e,r),H.viewport(P),H.scissor(F),H.setScissorTest(ae),i){let r=W.get(e.texture);B.framebufferTexture2D(B.FRAMEBUFFER,B.COLOR_ATTACHMENT0,B.TEXTURE_CUBE_MAP_POSITIVE_X+t,r.__webglTexture,n)}else if(a){let r=t;for(let t=0;t<e.textures.length;t++){let i=W.get(e.textures[t]);B.framebufferTextureLayer(B.FRAMEBUFFER,B.COLOR_ATTACHMENT0+t,i.__webglTexture,n,r)}}else if(e!==null&&n!==0){let t=W.get(e.texture);B.framebufferTexture2D(B.FRAMEBUFFER,B.COLOR_ATTACHMENT0,B.TEXTURE_2D,t.__webglTexture,n)}re=-1},this.readRenderTargetPixels=function(e,t,n,r,i,a,o,s=0){if(!(e&&e.isWebGLRenderTarget)){ft(`WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.`);return}let c=W.get(e).__webglFramebuffer;if(e.isWebGLCubeRenderTarget&&o!==void 0&&(c=c[o]),c){H.bindFramebuffer(B.FRAMEBUFFER,c);try{let o=e.textures[s],c=o.format,l=o.type;if(e.textures.length>1&&B.readBuffer(B.COLOR_ATTACHMENT0+s),!V.textureFormatReadable(c)){ft(`WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.`);return}if(!V.textureTypeReadable(l)){ft(`WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.`);return}t>=0&&t<=e.width-r&&n>=0&&n<=e.height-i&&B.readPixels(t,n,r,i,Qe.convert(c),Qe.convert(l),a)}finally{let e=M===null?null:W.get(M).__webglFramebuffer;H.bindFramebuffer(B.FRAMEBUFFER,e)}}},this.readRenderTargetPixelsAsync=async function(e,t,n,r,i,a,o,s=0){if(!(e&&e.isWebGLRenderTarget))throw Error(`THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.`);let c=W.get(e).__webglFramebuffer;if(e.isWebGLCubeRenderTarget&&o!==void 0&&(c=c[o]),c)if(t>=0&&t<=e.width-r&&n>=0&&n<=e.height-i){H.bindFramebuffer(B.FRAMEBUFFER,c);let o=e.textures[s],l=o.format,u=o.type;if(e.textures.length>1&&B.readBuffer(B.COLOR_ATTACHMENT0+s),!V.textureFormatReadable(l))throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.`);if(!V.textureTypeReadable(u))throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.`);let d=B.createBuffer();B.bindBuffer(B.PIXEL_PACK_BUFFER,d),B.bufferData(B.PIXEL_PACK_BUFFER,a.byteLength,B.STREAM_READ),B.readPixels(t,n,r,i,Qe.convert(l),Qe.convert(u),0);let f=M===null?null:W.get(M).__webglFramebuffer;H.bindFramebuffer(B.FRAMEBUFFER,f);let p=B.fenceSync(B.SYNC_GPU_COMMANDS_COMPLETE,0);return B.flush(),await Ct(B,p,4),B.bindBuffer(B.PIXEL_PACK_BUFFER,d),B.getBufferSubData(B.PIXEL_PACK_BUFFER,0,a),B.deleteBuffer(d),B.deleteSync(p),a}else throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.`)},this.copyFramebufferToTexture=function(e,t=null,n=0){let r=2**-n,i=Math.floor(e.image.width*r),a=Math.floor(e.image.height*r),o=t===null?0:t.x,s=t===null?0:t.y;G.setTexture2D(e,0),B.copyTexSubImage2D(B.TEXTURE_2D,n,0,0,o,s,i,a),H.unbindTexture()},this.copyTextureToTexture=function(e,t,n=null,r=null,i=0,a=0){let o,s,c,l,u,d,f,p,m,h=e.isCompressedTexture?e.mipmaps[a]:e.image;if(n!==null)o=n.max.x-n.min.x,s=n.max.y-n.min.y,c=n.isBox3?n.max.z-n.min.z:1,l=n.min.x,u=n.min.y,d=n.isBox3?n.min.z:0;else{let t=2**-i;o=Math.floor(h.width*t),s=Math.floor(h.height*t),c=e.isDataArrayTexture?h.depth:e.isData3DTexture?Math.floor(h.depth*t):1,l=0,u=0,d=0}r===null?(f=0,p=0,m=0):(f=r.x,p=r.y,m=r.z);let g=Qe.convert(t.format),_=Qe.convert(t.type),v;t.isData3DTexture?(G.setTexture3D(t,0),v=B.TEXTURE_3D):t.isDataArrayTexture||t.isCompressedArrayTexture?(G.setTexture2DArray(t,0),v=B.TEXTURE_2D_ARRAY):(G.setTexture2D(t,0),v=B.TEXTURE_2D),H.activeTexture(B.TEXTURE0),H.pixelStorei(B.UNPACK_FLIP_Y_WEBGL,t.flipY),H.pixelStorei(B.UNPACK_PREMULTIPLY_ALPHA_WEBGL,t.premultiplyAlpha),H.pixelStorei(B.UNPACK_ALIGNMENT,t.unpackAlignment);let y=H.getParameter(B.UNPACK_ROW_LENGTH),b=H.getParameter(B.UNPACK_IMAGE_HEIGHT),x=H.getParameter(B.UNPACK_SKIP_PIXELS),S=H.getParameter(B.UNPACK_SKIP_ROWS),C=H.getParameter(B.UNPACK_SKIP_IMAGES);H.pixelStorei(B.UNPACK_ROW_LENGTH,h.width),H.pixelStorei(B.UNPACK_IMAGE_HEIGHT,h.height),H.pixelStorei(B.UNPACK_SKIP_PIXELS,l),H.pixelStorei(B.UNPACK_SKIP_ROWS,u),H.pixelStorei(B.UNPACK_SKIP_IMAGES,d);let w=e.isDataArrayTexture||e.isData3DTexture,T=t.isDataArrayTexture||t.isData3DTexture;if(e.isDepthTexture){let n=W.get(e),r=W.get(t),h=W.get(n.__renderTarget),g=W.get(r.__renderTarget);H.bindFramebuffer(B.READ_FRAMEBUFFER,h.__webglFramebuffer),H.bindFramebuffer(B.DRAW_FRAMEBUFFER,g.__webglFramebuffer);for(let n=0;n<c;n++)w&&(B.framebufferTextureLayer(B.READ_FRAMEBUFFER,B.COLOR_ATTACHMENT0,W.get(e).__webglTexture,i,d+n),B.framebufferTextureLayer(B.DRAW_FRAMEBUFFER,B.COLOR_ATTACHMENT0,W.get(t).__webglTexture,a,m+n)),B.blitFramebuffer(l,u,o,s,f,p,o,s,B.DEPTH_BUFFER_BIT,B.NEAREST);H.bindFramebuffer(B.READ_FRAMEBUFFER,null),H.bindFramebuffer(B.DRAW_FRAMEBUFFER,null)}else if(i!==0||e.isRenderTargetTexture||W.has(e)){let n=W.get(e),r=W.get(t);H.bindFramebuffer(B.READ_FRAMEBUFFER,A),H.bindFramebuffer(B.DRAW_FRAMEBUFFER,j);for(let e=0;e<c;e++)w?B.framebufferTextureLayer(B.READ_FRAMEBUFFER,B.COLOR_ATTACHMENT0,n.__webglTexture,i,d+e):B.framebufferTexture2D(B.READ_FRAMEBUFFER,B.COLOR_ATTACHMENT0,B.TEXTURE_2D,n.__webglTexture,i),T?B.framebufferTextureLayer(B.DRAW_FRAMEBUFFER,B.COLOR_ATTACHMENT0,r.__webglTexture,a,m+e):B.framebufferTexture2D(B.DRAW_FRAMEBUFFER,B.COLOR_ATTACHMENT0,B.TEXTURE_2D,r.__webglTexture,a),i===0?T?B.copyTexSubImage3D(v,a,f,p,m+e,l,u,o,s):B.copyTexSubImage2D(v,a,f,p,l,u,o,s):B.blitFramebuffer(l,u,o,s,f,p,o,s,B.COLOR_BUFFER_BIT,B.NEAREST);H.bindFramebuffer(B.READ_FRAMEBUFFER,null),H.bindFramebuffer(B.DRAW_FRAMEBUFFER,null)}else T?e.isDataTexture||e.isData3DTexture?B.texSubImage3D(v,a,f,p,m,o,s,c,g,_,h.data):t.isCompressedArrayTexture?B.compressedTexSubImage3D(v,a,f,p,m,o,s,c,g,h.data):B.texSubImage3D(v,a,f,p,m,o,s,c,g,_,h):e.isDataTexture?B.texSubImage2D(B.TEXTURE_2D,a,f,p,o,s,g,_,h.data):e.isCompressedTexture?B.compressedTexSubImage2D(B.TEXTURE_2D,a,f,p,h.width,h.height,g,h.data):B.texSubImage2D(B.TEXTURE_2D,a,f,p,o,s,g,_,h);H.pixelStorei(B.UNPACK_ROW_LENGTH,y),H.pixelStorei(B.UNPACK_IMAGE_HEIGHT,b),H.pixelStorei(B.UNPACK_SKIP_PIXELS,x),H.pixelStorei(B.UNPACK_SKIP_ROWS,S),H.pixelStorei(B.UNPACK_SKIP_IMAGES,C),a===0&&t.generateMipmaps&&B.generateMipmap(v),H.unbindTexture()},this.initRenderTarget=function(e){W.get(e).__webglFramebuffer===void 0&&G.setupRenderTarget(e)},this.initTexture=function(e){e.isCubeTexture?G.setTextureCube(e,0):e.isData3DTexture?G.setTexture3D(e,0):e.isDataArrayTexture||e.isCompressedArrayTexture?G.setTexture2DArray(e,0):G.setTexture2D(e,0),H.unbindTexture()},this.resetState=function(){ee=0,ne=0,M=null,H.reset(),$e.reset()},typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`observe`,{detail:this}))}get coordinateSystem(){return je}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let t=this.getContext();t.drawingBufferColorSpace=z._getDrawingBufferColorSpace(e),t.unpackColorSpace=z._getUnpackColorSpace()}};function pa(e){if(e.sky==null&&!e.lampDayBoost)return null;let t=e.sky??8888508,n=e.lampDayBoost?.72:0;return{sky:t,fog:e.fog??t,hemiSky:e.hemiSky??16777215,hemiGround:e.hemiGround??4874304,sunColor:e.lampDayBoost?11584744:16774630,sunScale:e.lampDayBoost?.45:1,fogNear:e.lampDayBoost?100:void 0,nightBias:n,lampDayBoost:!!e.lampDayBoost}}var ma={forest:{id:`forest`,ground:4892730,runoff:13940886,asphalt:6975092,edge:16054008,density:1,vegetation:`trees`,props:`none`},coast:{id:`coast`,ground:12759680,runoff:15260080,asphalt:6054764,edge:15789024,density:.55,vegetation:`palms`,props:`water`},alpine:{id:`alpine`,ground:5926498,runoff:11054772,asphalt:5133404,edge:15922938,density:.62,vegetation:`pines`,props:`mountains`},meadow:{id:`meadow`,ground:9419850,runoff:14206090,asphalt:6975092,edge:16249572,density:.28,vegetation:`sparse`,props:`none`},canyon:{id:`canyon`,ground:12085810,runoff:14262374,asphalt:5918792,edge:15785152,density:.35,vegetation:`cactus`,props:`canyon`,sky:13150328,fog:12886128,hemiSky:16771272,hemiGround:9065776},urban:{id:`urban`,ground:3817544,runoff:6975608,asphalt:3817028,edge:15777824,density:.15,vegetation:`none`,props:`city`},yard:{id:`yard`,ground:9073480,runoff:12098154,asphalt:4869716,edge:16097298,density:.35,vegetation:`none`,props:`yard`}},ha={"forest-loop":`forest`,"harbor-circuit":`coast`,"summit-pass":`alpine`,"meadow-sweep":`meadow`,"canyon-cut":`canyon`,"oval-circuit":`urban`,"yard-drift":`yard`};function ga(e){return e in ma?ma[e]:ma[ha[e]??`forest`]}var _a=[[-10,-58],[10,-58],[30,-58],[46,-58],[58,-58],[67.3,-56.5],[75.6,-52.3],[82.3,-45.6],[86.5,-37.3],[88,-28],[88,-8],[88,10],[88,26],[86.5,33.7],[82.1,40.1],[75.7,44.5],[68,46],[60.3,44.5],[53.9,40.1],[49.5,33.7],[48,26],[48,18],[48,10],[47,3.8],[44.2,-1.8],[39.8,-6.2],[34.2,-9],[28,-10],[16,-10],[8,-10],[1.2,-8.9],[-4.9,-5.8],[-9.8,-.9],[-12.9,5.2],[-14,12],[-15.8,24.3],[-21.2,35.5],[-29.6,44.6],[-40.3,50.9],[-52.3,53.8],[-64.7,53.1],[-76.4,48.7],[-86.2,41.2],[-93,30],[-98,16],[-104,2],[-112,-12],[-118,-26],[-120,-40],[-114,-50],[-102,-56],[-90,-58],[-76,-58],[-60,-58],[-44,-58],[-32,-58]];function va(e,t,n){return e.map(([e,r])=>[e*t,r*n])}var ya=[{id:`forest-loop`,name:`Forest Loop`,biome:`forest`,points:va(_a,1.07,1.15)},{id:`harbor-circuit`,name:`Harbor Circuit`,biome:`coast`,points:[[-75.27,118.03],[-55.73,118.03],[-36.19,118.03],[-16.66,118.03],[2.88,118.03],[22.42,118.03],[41.95,118.03],[61.48,118.03],[81.02,118.03],[100.55,118.03],[120.09,118.03],[139.61,117.64],[157.77,113],[175.27,104.5],[189.04,90.77],[197.61,73.33],[200.01,54.04],[190.81,37.13],[180.83,20.37],[177.21,1.37],[183.26,-17.03],[193.95,-33.38],[200,-51.41],[196.76,-70.57],[187.46,-87.65],[173.11,-100.75],[155.25,-108.48],[135.86,-109.98],[116.96,-105.31],[97.64,-102.44],[78.31,-99.87],[62.9,-88.84],[56.35,-70.53],[51.6,-51.57],[47.35,-32.49],[43.97,-13.27],[41.35,6.09],[39.39,25.54],[37.68,44.98],[29.2,62.29],[12.95,72.67],[-6.35,73.07],[-23.04,63.4],[-32.25,46.45],[-34.91,27.12],[-38.15,7.87],[-41.13,-11.44],[-44.44,-30.71],[-48.59,-49.79],[-53.36,-68.73],[-61.76,-86.19],[-77.39,-97.52],[-96.38,-97.1],[-109.65,-83.13],[-119.48,-66.26],[-128.01,-48.68],[-135.36,-30.62],[-138.74,-11.44],[-146.3,4.88],[-160.75,17.91],[-170.4,34.79],[-174.28,53.85],[-172.03,73.18],[-163.83,90.81],[-150.53,105.02],[-133.46,114.35],[-114.33,117.9],[-94.79,118.03]]},{id:`summit-pass`,name:`Summit Pass`,biome:`alpine`,points:[[-87.18,71.31],[-74.32,71.31],[-61.47,71.31],[-48.63,70.73],[-35.92,68.83],[-23.67,65.05],[-12.19,59.45],[-1.93,51.85],[6.8,42.53],[14.08,31.99],[19.79,20.49],[26.51,9.59],[34.92,.05],[45.19,-7.26],[56.96,-11.47],[69.4,-12.02],[81.43,-8.81],[92.13,-2.25],[100.98,6.82],[108.15,17.4],[116.07,27.26],[126.09,34.1],[137.54,36.14],[148.62,32.75],[157.48,24.63],[163.18,13.51],[166.03,1.09],[166.64,-11.68],[165.05,-24.35],[160.97,-36.39],[154.27,-47.15],[145.21,-55.99],[134.34,-62.52],[122.33,-66.82],[109.73,-69.19],[96.92,-70.1],[84.07,-70.37],[71.22,-70.32],[58.36,-70.04],[45.51,-69.74],[32.66,-69.59],[19.85,-69.13],[7.7,-66.33],[-2.26,-59.86],[-8.51,-49.98],[-10.58,-37.95],[-10.15,-25.38],[-13.18,-13.48],[-20.29,-3.52],[-30.53,3.78],[-42.31,8.72],[-54.76,11.63],[-67.48,12.05],[-79.92,9.53],[-91.5,4.2],[-102.03,-3.13],[-112.96,-9.75],[-124.95,-13.68],[-137.38,-13.73],[-148.89,-9.43],[-157.99,-1.2],[-163.51,9.81],[-164.94,22.15],[-162.41,34.41],[-156.43,45.5],[-147.74,54.72],[-137.13,61.76],[-125.35,66.79],[-112.81,69.6],[-100.03,70.95]]},{id:`meadow-sweep`,name:`Meadow Sweep`,biome:`meadow`,points:[[-74.35,129.07],[-49.52,128.03],[-24.67,127.69],[.14,128.51],[23.22,120.4],[38.14,100.65],[48.22,78.04],[55.18,54.19],[63.09,30.62],[69.47,6.59],[75.37,-17.45],[96.4,-29.1],[121.1,-31.53],[145.5,-28.23],[164.43,-12.71],[171.4,11.04],[176.54,35.35],[177.37,60.18],[176.14,85.01],[175.93,109.74],[193.34,125.54],[218.08,127.73],[242.77,129.56],[265.37,119.51],[282.84,102.12],[293.19,79.71],[297.35,55.2],[300.7,30.59],[302.2,5.77],[305.53,-18.86],[307.51,-43.64],[307.69,-68.51],[307.69,-93.36],[299.67,-116.02],[276.59,-123.89],[251.78,-125.36],[226.93,-125.88],[202.08,-126.28],[177.23,-127.11],[152.38,-127.47],[127.51,-127.47],[102.68,-126.64],[77.83,-125.88],[52.96,-125.88],[28.11,-125.88],[3.24,-125.88],[-21.61,-126.32],[-46.17,-130.1],[-70.86,-129.75],[-90.84,-116.22],[-91.64,-92.2],[-76.99,-72.38],[-53.45,-65.39],[-28.71,-63.64],[-4.56,-59.78],[9.48,-40.63],[3.87,-16.87],[-15.38,-2.15],[-39.53,3.75],[-62.61,12.92],[-81.59,28.09],[-87.56,52.02],[-104.81,68.04],[-129.32,71.87],[-153.08,65.92],[-167.56,46.08],[-169.63,21.5],[-170.73,-3.31],[-176.38,-27.42],[-192.63,-45.65],[-213.83,-58.61],[-238.17,-62.42],[-261.77,-55.22],[-282.3,-41.36],[-297.23,-21.85],[-306.33,1.14],[-306.77,25.9],[-303.58,50.53],[-298.86,74.88],[-285.64,95.82],[-267.6,112.83],[-247.38,127.13],[-223,131.42],[-198.26,130.35],[-173.79,128.32],[-148.94,129.07],[-124.07,129.07],[-99.22,129.07]]},{id:`canyon-cut`,name:`Canyon Cut`,biome:`canyon`,points:[[-103.95,95.92],[-103.95,113.2],[-101.48,130.28],[-96.97,146.95],[-88.53,161.93],[-76.5,174],[-62,188],[-44,196],[-24,195],[-6,184],[4,168],[12.82,142.4],[17.51,125.87],[20.36,108.84],[22.92,91.75],[25.98,74.76],[29.62,57.87],[35.19,41.63],[44.31,27.12],[57.53,16.73],[73.98,12.21],[91.21,10.96],[108.45,9.92],[125.7,8.98],[142.96,8.32],[159.9,5.72],[175.22,-1.73],[186.29,-14.57],[190.9,-31.04],[189.73,-48.1],[182.26,-63.31],[168.5,-73.56],[152.34,-79.58],[135.43,-83.09],[118.43,-86.16],[101.44,-89.23],[85.09,-94.81],[70.03,-103.27],[56.66,-114.2],[46.9,-128.41],[38.39,-143.44],[26.35,-155.72],[10.67,-162.59],[-6.39,-164.65],[-23.59,-163.5],[-40.16,-158.88],[-56.64,-153.7],[-71.41,-145.08],[-83.44,-132.85],[-92.85,-118.44],[-103.47,-104.96],[-117.65,-95.66],[-133.62,-89.08],[-150.12,-84.11],[-167.09,-80.99],[-184.22,-78.76],[-201.08,-75.31],[-216.26,-67.77],[-227.32,-54.99],[-233.04,-38.87],[-234.71,-21.72],[-232.73,-4.83],[-224.94,10.44],[-212.99,22.53],[-197.46,26.31],[-181.61,28.9],[-164.36,26.05],[-147.09,25.96],[-130,31.26],[-114.88,47.58],[-104.65,61.39],[-103.95,78.65]]},{id:`oval-circuit`,name:`City Circuit`,biome:`urban`,points:[[0,-64],[22,-64],[44,-64],[66,-64],[88,-64],[110,-64],[119.75,-63.04],[129.13,-60.19],[137.78,-55.57],[145.36,-49.36],[151.57,-41.78],[156.19,-33.13],[159.04,-23.75],[160,-14],[160,-7],[160,0],[160,7],[160,14],[159.04,23.75],[156.19,33.13],[151.57,41.78],[145.36,49.36],[137.78,55.57],[129.13,60.19],[119.75,63.04],[110,64],[88,64],[66,64],[44,64],[22,64],[0,64],[-22,64],[-44,64],[-66,64],[-88,64],[-110,64],[-119.75,63.04],[-129.13,60.19],[-137.78,55.57],[-145.36,49.36],[-151.57,41.78],[-156.19,33.13],[-159.04,23.75],[-160,14],[-160,7],[-160,0],[-160,-7],[-160,-14],[-159.04,-23.75],[-156.19,-33.13],[-151.57,-41.78],[-145.36,-49.36],[-137.78,-55.57],[-129.13,-60.19],[-119.75,-63.04],[-110,-64],[-88,-64],[-66,-64],[-44,-64],[-22,-64]]}],ba=`yard-drift`,xa={id:ba,name:`Yard Drift`,biome:`yard`,points:[[48,-52],[58,-52],[68,-50],[78,-44],[88,-34],[94,-20],[96,-6],[94,10],[88,24],[78,36],[64,44],[48,46],[34,42],[22,34],[12,20],[6,10],[0,0],[-6,-10],[-12,-20],[-22,-34],[-34,-42],[-48,-46],[-62,-44],[-76,-36],[-88,-24],[-96,-10],[-98,6],[-94,22],[-84,36],[-70,44],[-54,46],[-40,40],[-28,30],[-16,18],[-8,8],[0,0],[8,-8],[16,-18],[26,-32],[36,-44],[42,-50]]};function Sa(e){return e===ba}function Ca(e){return Sa(e.id)||!!e.underpass}var wa=ya[0].id,Ta=[];function Ea(e){Ta=ya.map(e=>e.id);for(let e=Ta.length-1;e>0;e--){let t=Math.floor(Math.random()*(e+1)),n=Ta[e];Ta[e]=Ta[t],Ta[t]=n}if(e&&Ta.length>1&&Ta[Ta.length-1]===e){let e=Math.floor(Math.random()*(Ta.length-1)),t=Ta[Ta.length-1];Ta[Ta.length-1]=Ta[e],Ta[e]=t}}function Da(e){Ta.length===0&&Ea(e);let t=Ta.pop();return e&&t===e&&Ta.length>0?(Ta.unshift(t),t=Ta.pop()):e&&t===e&&(Ea(e),t=Ta.pop()),t}function Oa(e){return e===`yard-drift`?xa:ya.find(t=>t.id===e)??ya[0]}function ka(e){return Sa(e)||ya.some(t=>t.id===e)}var Aa=1;function ja(e){return Math.atan2(e.x,e.z)}function Q(e,t){let n=Math.imul(e|0,374761393)^Math.imul(t|0,668265263);return n=Math.imul(n^n>>>13,1274126177),((n^n>>>16)>>>0)/4294967296}function Ma(e=.28,t=5.8){let n=new U({color:16773320,emissive:16771232,emissiveIntensity:e,roughness:.35});return n.userData.nightLamp=!0,n.userData.emissiveDay=e,n.userData.emissiveNight=t,n}function Na(e,t,n,r=1.6,i=22){let a=new he(16769192,0,i,2);return a.position.set(e,t,n),a.castShadow=!1,a.visible=!1,a.userData.nightLamp=!0,a.userData.nightIntensity=r,a}function Pa(e,t){return{trunk:new U({color:e,roughness:.9}),canopy:t.map(e=>new U({color:e,roughness:.9}))}}var Fa={trees:Pa(5913122,[2787890]),pines:Pa(3811864,[1722920,1457698,2382386]),palms:Pa(12886122,[1997366,2789698,3844176]),cactus:Pa(3828266,[3828266,4554804,3103268]),sparse:Pa(5913122,[3111460])},Ia=new Set(Object.values(Fa).flatMap(e=>[e.trunk,...e.canopy])),La=1500,Ra=2400,za=2e3,Ba=4.8,Va=6.5;function Ha(e,t){let n=t+Ba,r=n+Va,i=[];for(let t=0;t<960;t++)i.push(e.getPointAt(t/960));let a=new Map;for(let e=0;e<960;e++){let t=i[e],n=`${Math.floor(t.x/16)},${Math.floor(t.z/16)}`,r=a.get(n);r||(r=[],a.set(n,r)),r.push(e)}let o=(e,t)=>{let n=Math.floor(e/16),r=Math.floor(t/16),o=1/0;for(let s=-2;s<=2;s++)for(let c=-2;c<=2;c++){let l=a.get(`${n+s},${r+c}`);if(l)for(let n of l){let r=i[n],a=(r.x-e)*(r.x-e)+(r.z-t)*(r.z-t);a<o&&(o=a)}}return o},s=(e,t)=>{let n=!1;for(let r=0,a=959;r<960;a=r++){let o=i[r],s=i[a],c=o.z,l=s.z;c>t!=l>t&&e<(s.x-o.x)*(t-c)/(l-c+1e-12)+o.x&&(n=!n)}return n},c=1/0,l=-1/0,u=1/0,d=-1/0;for(let e=0;e<960;e++){let t=i[e];t.x<c&&(c=t.x),t.x>l&&(l=t.x),t.z<u&&(u=t.z),t.z>d&&(d=t.z)}c-=8,l+=8,u-=8,d+=8;let f=Math.max(1,Math.ceil((l-c)/4)),p=Math.max(1,Math.ceil((d-u)/4)),m=new Uint8Array(f*p);for(let e=0;e<p;e++)for(let t=0;t<f;t++)s(c+(t+.5)*4,u+(e+.5)*4)&&(m[e*f+t]=1);let h=(e,t)=>{let n=Math.floor((e-c)/4),r=Math.floor((t-u)/4);return n<0||r<0||n>=f||r>=p?!1:m[r*f+n]!==0},g=(e,t,n)=>o(e,t)>=(r+Math.max(0,n))**2;return{minDist2:o,baseClear:r,runoffClear:n,clearOf:g,outsideRunoff:(e,t,r)=>o(e,t)>=(n+Math.max(0,r))**2,insideLoop:h,sceneryOk:(e,t,n)=>!h(e,t)&&g(e,t,n)}}function Ua(e,t,n,r=Ha(e,t),i){let a=Ro(e),o=!!i?.forest,s=!!i?.meadow,c=[],l=(e,t,n)=>{if(e<a.minX||e>a.maxX||t<a.minZ||t>a.maxZ)return;let i=n*1.6;r.sceneryOk(e,t,i)&&c.push({x:e,z:t,scale:n,jitter:Q(Math.round(e*10),Math.round(t*10))})},u=o?[18,24,30,38,48,60,74,90,108,128,150]:s?[18,24,32,42,54,68,84,102,122,145]:[22,30,40,52,68,88,112,140],d=o?220:s?200:160,f=new I,p=new I,m=1-Math.max(o?.04:s?.06:.12,Math.min(1,n)),h=o?.12:s?.14:.28;for(let t of u)for(let n=0;n<d;n++){let r=n/d,i=e.getPointAt(r);f.copy(e.getTangentAt(r)).normalize(),p.set(-f.z,0,f.x);let a=Q(n,Math.round(t*10));if(!(a<h+m*.5))for(let e of[-1,1]){let r=e*(t+(a-.5)*3.2),o=(Q(Math.round(t*7),n+e*17)-.5)*2.4;l(i.x+p.x*r+f.x*o,i.z+p.z*r+f.z*o,(s?.75:.65)+a*(s?.8:.7))}}let g=o?5.2:s?6.8:n>.7?8.5:n>.4?11.5:15,_=o?.1:s?.12:.22;for(let e=a.minX;e<=a.maxX;e+=g)for(let t=a.minZ;t<=a.maxZ;t+=g){let n=Q(Math.round(e*3),Math.round(t*3));n<_+m*.55||l(e+(n-.5)*5.2,t+(Q(Math.round(t*5),Math.round(e*5))-.5)*5.2,(s?.7:.55)+n*(s?.9:.85))}let v=Math.max(80,Math.round((o?Ra:s?za:La)*(s?Math.max(n,.92):n)));if(c.length>v){let e=[];for(let t=0;t<c.length;t++)Q(t*17,Math.round(c[t].x*3))<v/c.length&&e.push(c[t]);if(e.length<v*.85)for(let t=0;t<c.length&&e.length<v;t++)Q(t*31,Math.round(c[t].z*5))>.55&&e.push(c[t]);c.length=0,c.push(...e.slice(0,v))}return{poses:c,bounds:a,clearance:r}}function Wa(){let e=[],t=(t,n,r,i,a,o,s,c,l)=>{e.push(t,n,r,i,a,o,s,c,l)},n=(e,n,r,i,a,o,s,c,l,u,d,f)=>{t(e,n,r,i,a,o,u,d,f),t(e,n,r,u,d,f,s,c,l),t(e,n,r,u,d,f,i,a,o),t(e,n,r,s,c,l,u,d,f)},r=.2;t(0,.32,0,r,.06,0,0,.06,r),t(0,.32,0,0,.06,r,-.2,.06,0),t(0,.32,0,-.2,.06,0,0,.06,-.2),t(0,.32,0,0,.06,-.2,r,.06,0);for(let e of[{count:6,yawOff:.2,tipR:1.55,tipY:-.22,midR:.82,midY:.28,halfW:.34,rootR:.1,baseY:.1},{count:8,yawOff:0,tipR:2.4,tipY:-1.15,midR:1.28,midY:-.12,halfW:.44,rootR:.14,baseY:.02}])for(let t=0;t<e.count;t++){let r=(t+e.yawOff)/e.count*Math.PI*2,i=Math.cos(r),a=Math.sin(r),o=-a,s=i,c=i*e.rootR,l=a*e.rootR,u=i*e.tipR,d=a*e.tipR,f=i*e.midR,p=a*e.midR,m=f+o*e.halfW,h=p+s*e.halfW,g=f-o*e.halfW,_=p-s*e.halfW;n(c,e.baseY,l,m,e.midY,h,g,e.midY,_,u,e.tipY,d);let v=e.midR*.55+e.tipR*.45,y=e.midY*.4+e.tipY*.6,b=e.halfW*.42,x=i*v,S=a*v;n(f,e.midY,p,x+o*b,y,S+s*b,x-o*b,y,S-s*b,u,e.tipY,d)}let i=new Pt;return i.setAttribute(`position`,new N(e,3)),i.computeVertexNormals(),i}function Ga(e,t,n=Fa.palms,r){if(!t.length)return;let i=3.85,a=r?.trunk??new L(.065,.28,i,6),o=r?.canopy??Wa(),s=new Ce,c=t.length,l=new x(a,n.trunk,c);l.count=0,l.castShadow=!1,l.receiveShadow=!1,l.frustumCulled=!0,l.userData.sharedVegMat=!0;let u=n.canopy.map(e=>{let t=new x(o,e,c);return t.count=0,t.castShadow=!1,t.receiveShadow=!1,t.frustumCulled=!0,t.userData.sharedVegMat=!0,t}),d=n.canopy.map(e=>{let t=new x(o,e,c);return t.count=0,t.castShadow=!1,t.receiveShadow=!1,t.frustumCulled=!0,t.userData.sharedVegMat=!0,t});for(let e=0;e<c;e++){let{x:r,z:a,scale:o,jitter:c}=t[e],f=c*Math.PI*2,p=.06+c*.14,m=c*Math.PI*2+1.7,h=Math.cos(m)*p,g=Math.sin(m)*p,_=Math.sin(p)*i*o*.85,v=r+Math.cos(m)*_,y=a+Math.sin(m)*_;s.position.set(r,i*.5*o,a),s.scale.set(o,o,o),s.rotation.set(h,f,g),s.updateMatrix(),l.setMatrixAt(l.count++,s.matrix);let b=Math.floor(c*n.canopy.length)%n.canopy.length,x=o*(.92+c*.22),S=i*o;s.position.set(v,S,y),s.scale.set(x,x,x),s.rotation.set(h*.65,f,g*.65),s.updateMatrix(),u[b].setMatrixAt(u[b].count++,s.matrix),s.position.set(v,S-.12*o,y),s.scale.set(x*.82,x*.88,x*.82),s.rotation.set(h*.5,f+.52,g*.5),s.updateMatrix(),d[b].setMatrixAt(d[b].count++,s.matrix)}l.instanceMatrix.needsUpdate=!0,l.computeBoundingSphere(),e.add(l);for(let t of[...u,...d])t.count&&(t.instanceMatrix.needsUpdate=!0,t.computeBoundingSphere(),e.add(t))}function Ka(e){switch(e.vegetation){case`pines`:return Fa.pines;case`palms`:return Fa.palms;case`cactus`:return Fa.cactus;case`sparse`:return Fa.sparse;default:return Fa.trees}}function qa(e,t,n,r,i){if(r.vegetation===`none`)return 0;let a=Ka(r),o=r.id===`meadow`,s=Ua(t,n,o?Math.max(r.density,.92):r.density,i,{forest:r.id===`forest`,meadow:o}),c=i??s.clearance,l=r.vegetation===`palms`&&r.props===`water`?lo(s.poses,t,c):s.poses,{bounds:u}=s;if(!l.length)return 0;let d=new Map,f=u.minX-10,p=u.minZ-10;for(let e of l){let t=`${Math.floor((e.x-f)/72)},${Math.floor((e.z-p)/72)}`,n=d.get(t);n||(n=[],d.set(t,n)),n.push(e)}if(r.vegetation===`palms`){let t={trunk:new L(.065,.28,3.85,6),canopy:Wa()};for(let n of d.values())n.length&&Ga(e,n,a,t);return l.length}let m=r.vegetation===`pines`,h=r.vegetation===`cactus`,g=h?new L(.18,.22,2.4,5):new L(.22,.3,m?2.2:1.2,5),_=m?new nt(1.1,2.6,6):h?new pe(.35,5,4):new pe(1.35,6,6),v=new Ce,y=a.canopy;for(let t of d.values()){let n=t.length;if(n===0)continue;let r=new x(g,a.trunk,n);r.castShadow=!1,r.receiveShadow=!1,r.frustumCulled=!0,r.userData.sharedVegMat=!0;let i=y.map(()=>0);for(let e of t)i[Math.floor(e.jitter*y.length)%y.length]+=1;let o=y.map((e,t)=>{let n=new x(_,e,Math.max(1,i[t]));return n.castShadow=!1,n.receiveShadow=!1,n.frustumCulled=!0,n.count=0,n.userData.sharedVegMat=!0,n}),s=m?y.map(e=>{let t=new x(_,e,Math.max(1,n));return t.castShadow=!1,t.receiveShadow=!1,t.frustumCulled=!0,t.count=0,t.userData.sharedVegMat=!0,t}):null;for(let e=0;e<n;e++){let{x:n,z:i,scale:a,jitter:c}=t[e],l=h||m?1.1:.6;v.position.set(n,l*a,i),v.scale.set(a,a,a),v.rotation.set(0,c*Math.PI*2,0),v.updateMatrix(),r.setMatrixAt(e,v.matrix);let u=Math.floor(c*y.length)%y.length,d=o[u],f=m?2.2*a:h?2.5*a:2*a,p=h?.9+c*.3:(1.35*a+c*.35)/1.35;if(v.position.set(n,f,i),v.scale.set(p,m?p*1.25:p,p),v.updateMatrix(),d.setMatrixAt(d.count++,v.matrix),s){let e=s[u];v.position.set(n,f+1.15*a,i),v.scale.set(p*.62,p*.95,p*.62),v.updateMatrix(),e.setMatrixAt(e.count++,v.matrix)}}r.instanceMatrix.needsUpdate=!0,e.add(r);for(let t of o)t.count!==0&&(t.instanceMatrix.needsUpdate=!0,t.computeBoundingSphere(),e.add(t));if(s)for(let t of s)t.count!==0&&(t.instanceMatrix.needsUpdate=!0,t.computeBoundingSphere(),e.add(t));r.computeBoundingSphere()}return l.length}function Ja(e=11,t=7,n=0){let r=[],i=(e,t,n,i,a,o,s,c,l)=>{r.push(e,t,n,i,a,o,s,c,l)},a=Q(n,1)*Math.PI*2,o=Math.cos(a),s=Math.sin(a),c=1.42+Q(n,2)*.5,l=.68+Q(n,6)*.16,u=.2+Q(n,4)*.16,d=e=>{let t=(1-e)**.52,n=e>.2&&e<.5?.14*Math.sin((e-.2)/.3*Math.PI):0;return Math.max(.035,t*(.94+n))},f=[];for(let r=0;r<=t;r++){let i=r/t,a=i,p=d(i),m=u*i*i,h=[];for(let t=0;t<e;t++){let a=t/e*Math.PI*2,u=.78+Q(n*17+t,r*9+5)*.32+Q(t*3+r,n+11)*.1,d=t%3==n%3&&i>.15&&i<.72?1.18:1,f=Math.max(.02,p*u*d),g=Math.cos(a)*f*c,_=Math.sin(a)*f*l,v=g*o-_*s+o*m,y=g*s+_*o+s*m;h.push({x:v,z:y})}f.push({y:a,pts:h})}for(let t=0;t<f.length-1;t++){let n=f[t],r=f[t+1];for(let t=0;t<e;t++){let a=(t+1)%e,o=n.pts[t],s=n.pts[a],c=r.pts[t],l=r.pts[a];i(o.x,n.y,o.z,s.x,n.y,s.z,l.x,r.y,l.z),i(o.x,n.y,o.z,l.x,r.y,l.z,c.x,r.y,c.z)}}let p=f[f.length-1],m=o*u,h=s*u;for(let t=0;t<e;t++){let n=(t+1)%e,r=p.pts[t],a=p.pts[n];i(r.x,p.y,r.z,a.x,p.y,a.z,m,p.y+.02,h)}let g=f[0];for(let t=0;t<e;t++){let n=(t+1)%e,r=g.pts[t],a=g.pts[n];i(0,0,0,a.x,0,a.z,r.x,0,r.z)}let _=new Pt;return _.setAttribute(`position`,new N(r,3)),_.computeVertexNormals(),_}function Ya(e=0){return Ja(8,4,e+40)}function Xa(e,t=.55){let n=[],r=(e,t,r,i,a,o,s,c,l)=>{n.push(e,t,r,i,a,o,s,c,l)};for(let n=0;n<e.length-1;n++){let[i,a]=e[n],[o,s]=e[n+1];r(i,0,t,o,0,t,o,s,t),r(i,0,t,o,s,t,i,a,t),r(o,0,-t,i,0,-t,i,a,-t),r(o,0,-t,i,a,-t,o,s,-t),r(i,a,t,o,s,t,o,s,-t),r(i,a,t,o,s,-t,i,a,-t)}let i=e[0],a=e[e.length-1];r(i[0],0,t,i[0],0,-t,i[0],i[1],-t),r(i[0],0,t,i[0],i[1],-t,i[0],i[1],t),r(a[0],0,-t,a[0],0,t,a[0],a[1],t),r(a[0],0,-t,a[0],a[1],t,a[0],a[1],-t);let o=new Pt;return o.setAttribute(`position`,new N(n,3)),o.computeVertexNormals(),o}function Za(){return Xa([[-1,.05],[-.82,.34],[-.64,.16],[-.42,.58],[-.2,.3],[0,.74],[.2,.36],[.4,.62],[.62,.2],[.82,.38],[1,.06]],1.2)}var Qa=28,$a=18,eo=40;function to(e){let t=.5+.5*Math.sin(e*Math.PI*2*2.15),n=.5+.5*Math.sin(e*Math.PI*2*5.4+1.1),r=.5+.5*Math.sin(e*Math.PI*2*.85+.55),i=Math.floor(e*320)%320,a=Q(i,77)*.4+Q((i+1)%320,77)*.6,o=0;for(let t of[.08,.27,.49,.66,.91]){let n=Math.min(Math.abs(e-t),1-Math.abs(e-t));if(n<.055){let e=1-n/.055;o=Math.max(o,e*e)}}let s=Qa+a*12,c=52+n*36,l=(.2+.8*(.5*r+.3*t+.2*n))**1.25,u=s*(1-l)+c*l;return u=u*(1-o*.35)+s*o,Math.max(Qa,u)}function no(e,t){let n=e.length;if(n===0)return[];if(t<=0)return e.slice();let r=Array(n);for(let i=0;i<n;i++){let a=0;for(let r=-t;r<=t;r++){let t=e[(i+r+n*8)%n];t>a&&(a=t)}r[i]=a}return r}function ro(e,t,n,r,i){let a=e.length,o=(e,t)=>r.minDist2(e,t)<i||r.insideLoop(e,t);for(let r=0;r<a;r++){let i=t[r],a=n[r],s=e[r];if(!o(i.x+a.x*s,i.z+a.z*s))continue;let c=Math.min(240,s+12);for(;c<240&&o(i.x+a.x*c,i.z+a.z*c);)s=c,c=Math.min(240,c+12);for(let e=0;e<10;e++){let e=(s+c)*.5;o(i.x+a.x*e,i.z+a.z*e)?s=e:c=e}e[r]=c}let s=no(e,Math.max(2,Math.round(a*.012)));for(let t=0;t<a;t++)e[t]=s[t];let c=[.35,.5,.65];for(let r=0;r<6;r++){let r=!1;for(let i=0;i<a;i++){let s=t[i],l=n[i],u=(i+1)%a,d=t[u],f=n[u],p=s.x+l.x*e[i],m=s.z+l.z*e[i],h=d.x+f.x*e[u],g=d.z+f.z*e[u],_=o(p,m)||o(h,g);if(!_){for(let e of c)if(o(p+(h-p)*e,m+(g-m)*e)){_=!0;break}}_&&(e[i]+=5,e[u]+=5,r=!0)}if(!r)break}}function io(e,t,n,r,i,a=1731226){let o=new U({color:a,metalness:a===1731226?.35:.18,roughness:a===1731226?.22:.45,transparent:!1,depthWrite:!0,polygonOffset:!0,polygonOffsetFactor:1,polygonOffsetUnits:1}),s=t.getLength(),c=Math.max(400,Math.min(720,Math.ceil(s/1.55))),l=n.runoffClear+Qa,u=l*l,d=[],f=[],p=[],m=new I,h=new I,g=new I;for(let e=0;e<c;e++){let r=e/c;t.getPointAt(r,m),h.copy(t.getTangentAt(r)).normalize(),g.set(-h.z,0,h.x);let i=n.runoffClear+2,a=n.insideLoop(m.x+g.x*i,m.z+g.z*i)?-1:1;d.push({x:m.x,z:m.z}),f.push({x:g.x*a,z:g.z*a}),p.push(to(r))}let _=no(p,eo).map(e=>n.runoffClear+e);ro(_,d,f,n,u);let v=[];for(let e=0;e<c;e++){let t=d[e],n=f[e],r=_[e];v.push({x:t.x+n.x*r,z:t.z+n.z*r})}let y=new J(new j(r.spanX+80,r.spanZ+80),o);y.rotation.x=-Math.PI/2,y.position.set(r.cx,-.11,r.cz),y.receiveShadow=!1,y.userData.surface=`water`,y.renderOrder=-2,e.add(y);let b=new w;b.moveTo(v[0].x,v[0].z);for(let e=1;e<v.length;e++)b.lineTo(v[e].x,v[e].z);b.closePath();let x=new U({color:i,roughness:1,metalness:0}),S=new J(new et(b),x);S.rotation.x=-Math.PI/2,S.position.y=-.105,S.receiveShadow=!0,S.userData.surface=`grass`,S.userData.baseColor=i,S.renderOrder=-1,e.add(S)}var ao=10;function oo(e,t,n){let r=new U({color:14206112,roughness:.85,metalness:.05,flatShading:!0}),i=[15222856,15790318,3108820,15777824,15231016,2795680,15222904,15790318].map(e=>new U({color:e,roughness:.88,metalness:.02,flatShading:!0,side:2})),a=3.4,o=new L(.045,.06,a,5),s=new nt(1.55,.95,7),c=new nt(1.58,.96,7,1,!1,0,Math.PI/3.5),l=new x(o,r,36);l.count=0,l.castShadow=!1,l.receiveShadow=!0;let u=i.map(e=>{let t=new x(s,e,36);return t.count=0,t.castShadow=!1,t.receiveShadow=!0,t}),d=i.map(e=>{let t=new x(c,e,36);return t.count=0,t.castShadow=!1,t.receiveShadow=!0,t}),f=new Ce,p=new I,m=new I,h=new I,g=[];for(let e=0;e<72&&l.count<36;e++){let r=(e+.37)/72;if(Q(e*11,401)<.42)continue;t.getPointAt(r,p),m.copy(t.getTangentAt(r)).normalize(),h.set(-m.z,0,m.x);let o=n.runoffClear+2,s=n.insideLoop(p.x+h.x*o,p.z+h.z*o)?-1:1,c=to(r),_=n.runoffClear+c,v=n.baseClear+1.2,y=_-ao;if(y<=v+2)continue;let b=.55+Q(e*7,509)*.37,x=v+(y-v)*b,S=(Q(e*3,613)-.5)*3.2,C=p.x+h.x*s*x+m.x*S,w=p.z+h.z*s*x+m.z*S;if(n.insideLoop(C,w)||!n.outsideRunoff(C,w,1.6))continue;let T=n.minDist2(C,w);if(T<v*v||T>y*y)continue;let E=!1;for(let e of g){let t=e.x-C,n=e.z-w;if(t*t+n*n<196){E=!0;break}}if(E)continue;let D=.88+Q(e*5,701)*.28,O=Q(e*17,809)*Math.PI*2,k=a*D;f.position.set(C,k*.5,w),f.scale.set(D,D,D),f.rotation.set(0,O,0),f.updateMatrix(),l.setMatrixAt(l.count++,f.matrix);let A=Math.floor(Q(e*23,907)*i.length)%i.length;if(f.position.set(C,k-.15*D,w),f.scale.set(D,D,D),f.rotation.set(0,O,0),f.updateMatrix(),u[A].setMatrixAt(u[A].count++,f.matrix),Q(e*29,1009)>.45){let t=(A+1+ +(Q(e,1103)>.5))%i.length;f.rotation.set(0,O+Math.PI/7,0),f.updateMatrix(),d[t].setMatrixAt(d[t].count++,f.matrix)}g.push({x:C,z:w})}l.instanceMatrix.needsUpdate=!0,l.computeBoundingSphere(),e.add(l);for(let t of u)t.count&&(t.instanceMatrix.needsUpdate=!0,t.computeBoundingSphere(),e.add(t));for(let t of d)t.count&&(t.instanceMatrix.needsUpdate=!0,t.computeBoundingSphere(),e.add(t))}var so=8;function co(e,t,n){let r=.52,i=Math.PI*2/6,a=[15222856,15790318,3108820,15777824,15231016,2795680].map(e=>new U({color:e,roughness:.72,metalness:.04,flatShading:!0})),o=new pe(r,3,5,0,i),s=a.map(e=>{let t=new x(o,e,3);return t.count=0,t.castShadow=!1,t.receiveShadow=!0,t}),c=new Ce,l=new I,u=new I,d=new I,f=[];for(let e=0;e<96;e++){let r=(e+.61)/96;if(Q(e*19,1201)<.5)continue;t.getPointAt(r,l),u.copy(t.getTangentAt(r)).normalize(),d.set(-u.z,0,u.x);let i=n.runoffClear+2,a=n.insideLoop(l.x+d.x*i,l.z+d.z*i)?-1:1,o=to(r),s=n.runoffClear+o,c=n.baseClear+1.2,p=s-so;if(p<=c+2)continue;let m=.58+Q(e*7,1303)*.34,h=c+(p-c)*m,g=(Q(e*3,1409)-.5)*4.5,_=l.x+d.x*a*h+u.x*g,v=l.z+d.z*a*h+u.z*g;if(n.insideLoop(_,v)||!n.outsideRunoff(_,v,1.2))continue;let y=n.minDist2(_,v);y<c*c||y>p*p||f.push({x:_,z:v,i:e})}let p=[];for(;p.length<3&&f.length;){let e=0,t=-1;for(let n=0;n<f.length;n++){let r=f[n],i=1/0;for(let e of p){let t=e.x-r.x,n=e.z-r.z;i=Math.min(i,t*t+n*n)}let a=p.length===0?Q(r.i*31,2003):i;a>t&&(t=a,e=n)}p.push(f.splice(e,1)[0])}let m=new tt,h=new tt,g=new P,_=new I(0,1,0);for(let e of p){let t=e.i,n=.85+Q(t*5,1511)*.35;g.set((Q(t*11,1607)-.5)*1.1,Q(t*17,1709)*Math.PI*2,(Q(t*23,1811)-.5)*.9),m.setFromEuler(g);let a=Math.floor(Q(t*29,1913)*6)%6,o=r*n;for(let t=0;t<6;t++){let r=(t+a)%6;h.setFromAxisAngle(_,t*i),c.position.set(e.x,o,e.z),c.scale.set(n,n,n),c.quaternion.copy(m).multiply(h),c.updateMatrix(),s[r].setMatrixAt(s[r].count++,c.matrix)}}for(let t of s)t.count&&(t.instanceMatrix.needsUpdate=!0,t.computeBoundingSphere(),e.add(t))}function lo(e,t,n){let r=[],i=[],a=new I;for(let e=0;e<256;e++){let n=e/256;t.getPointAt(n,a),r.push({x:a.x,z:a.z}),i.push(to(n))}let o=no(i,Math.max(8,Math.round(256/900*eo))),s=new Map;for(let e=0;e<256;e++){let t=r[e],n=`${Math.floor(t.x/24)},${Math.floor(t.z/24)}`,i=s.get(n);i||(i=[],s.set(n,i)),i.push(e)}return e.filter(e=>{if(n.insideLoop(e.x,e.z)||!n.outsideRunoff(e.x,e.z,e.scale*1.8))return!1;let t=0,i=1/0,a=Math.floor(e.x/24),c=Math.floor(e.z/24);for(let n=-2;n<=2;n++)for(let o=-2;o<=2;o++){let l=s.get(`${a+n},${c+o}`);if(l)for(let n of l){let a=r[n],o=(a.x-e.x)*(a.x-e.x)+(a.z-e.z)*(a.z-e.z);o<i&&(i=o,t=n)}}if(!Number.isFinite(i)||i===1/0)for(let n=0;n<256;n++){let a=r[n],o=(a.x-e.x)*(a.x-e.x)+(a.z-e.z)*(a.z-e.z);o<i&&(i=o,t=n)}let l=n.runoffClear+o[t],u=n.runoffClear+to(t/256),d=Math.min(l,u+8),f=n.baseClear+e.scale*.8,p=d-$a-e.scale*1.5;return p<=f?!1:i>=f*f&&i<=p*p})}function uo(e,t,n,r,i,a){let o=new Ce;if(n.props===`water`&&(io(e,t,r,a,n.ground),oo(e,t,r),co(e,t,r)),n.props===`canyon`&&(po(e,t,r,o,a),mo(e,t,r,a)),n.props===`mountains`){let n=new U({color:7240328,roughness:.92,metalness:.04,flatShading:!0,emissive:2371648,emissiveIntensity:.07}),s=new U({color:8358550,roughness:.9,metalness:.04,flatShading:!0,emissive:2897476,emissiveIntensity:.05}),c=new U({color:9082014,roughness:.88,metalness:.05,flatShading:!0}),l=new U({color:16054267,roughness:.78,metalness:.02,flatShading:!0,emissive:12109012,emissiveIntensity:.12}),u=[Ja(9,6,1),Ja(10,7,2),Ja(8,6,3)],d=[Ya(1),Ya(2),Ya(3)],f=Za(),p=new De(1,0),m=new x(u[0],n,180),h=new x(u[1],s,76),g=new x(u[2],c,84),_=new x(d[0],l,180),v=new x(d[1],l,76),y=new x(f,s,28),b=Math.min(70,Math.max(20,Math.floor(i.length*.1))),S=new x(p,s,b);m.count=0,h.count=0,g.count=0,_.count=0,v.count=0,y.count=0,S.count=0;for(let e of[m,h,g,_,v,y,S])e.castShadow=!1,e.receiveShadow=!1,e.frustumCulled=!0;let C=a.cx,w=a.cz,T=Math.min(300,Math.max(a.spanX,a.spanZ)*.58+185),E=Math.min(270,Math.max(a.spanX,a.spanZ)*.52+155),D=Math.min(235,Math.max(a.spanX,a.spanZ)*.48+125),O=Math.min(205,Math.max(a.spanX,a.spanZ)*.4+100),k=Math.min(220,Math.max(a.spanX,a.spanZ)*.45+115),A=(e,t,n,r,i,a,s,c,l,u)=>{if(e.count>=e.instanceMatrix.count||(o.position.set(r,l,i),o.scale.set(a,s,a*(.82+Q(n,15)*.35)),o.rotation.set(0,c,0),o.updateMatrix(),e.setMatrixAt(e.count++,o.matrix),!u||t.count>=t.instanceMatrix.count))return;let d=s*(.56+Q(n,17)*.08),f=a*(.58+Q(n,19)*.1);o.position.set(r,l+s*.4,i),o.scale.set(f,d,f*(.9+Q(n,21)*.16)),o.rotation.set(0,c+.2,0),o.updateMatrix(),t.setMatrixAt(t.count++,o.matrix)},j=(e,t,n)=>{let r=n*n;for(let n of i){let i=n.x-e,a=n.z-t;if(i*i+a*a<r)return!0}return!1};for(let e=0;e<56;e++){let t=e/56*Math.PI*2+Q(e,2)*.05,n=T+(Q(e,4)-.5)*22,r=C+Math.cos(t)*n,i=w+Math.sin(t)*n,a=28+Q(e,8)*18,o=34+Q(e,11)*26,s=Q(e,13)*Math.PI*2;A(m,_,e,r,i,a,o,s,-2.5,!0);let c=t+.045+(Q(e,25)-.5)*.03,l=n-8-Q(e,27)*14,u=C+Math.cos(c)*l,d=w+Math.sin(c)*l;A(m,_,e+200,u,d,a*(.55+Q(e,29)*.25),o*(.55+Q(e,31)*.3),s+1.1,-2.2,Q(e,33)>.35)}for(let e=0;e<48;e++){let t=(e+.5)/48*Math.PI*2+Q(e,40)*.04,n=E+(Q(e,42)-.5)*28,r=C+Math.cos(t)*n,i=w+Math.sin(t)*n,a=18+Q(e,44)*14,o=22+Q(e,46)*22;A(g,_,e+400,r,i,a,o,Q(e,48)*Math.PI*2,-2,!0)}for(let e=0;e<40;e++){let t=e/40*Math.PI*2+.11+Q(e,50)*.06,n=D+(Q(e,52)-.5)*20,i=C+Math.cos(t)*n,a=w+Math.sin(t)*n,o=16+Q(e,54)*12;if(!r.sceneryOk(i,a,o*.65+10)||j(i,a,o+8))continue;let s=20+Q(e,56)*18;A(h,v,e+600,i,a,o,s,Q(e,58)*Math.PI*2,-1.8,!0)}for(let e=0;e<28;e++){let t=(e+.35)/28*Math.PI*2,n=C+Math.cos(t)*k,i=w+Math.sin(t)*k,a=36+Q(e,17)*22,s=11+Q(e,19)*9,c=16+Q(e,23)*18,l=t+Math.PI/2;r.sceneryOk(n,i,Math.max(22,a*.5+6))&&(j(n,i,Math.max(a,s)*.5+4)||(o.position.set(n,-2.5,i),o.scale.set(a,c,s),o.rotation.set(0,l+(Q(e,29)-.5)*.12,0),o.updateMatrix(),y.setMatrixAt(y.count++,o.matrix)))}for(let e=0;e<36;e++){let t=e/36*Math.PI*2+.19+Q(e,60)*.05,n=O+(Q(e,62)-.5)*16,i=C+Math.cos(t)*n,a=w+Math.sin(t)*n,o=14+Q(e,35)*10;if(!r.sceneryOk(i,a,o*.7+8)||j(i,a,o+6))continue;let s=16+Q(e,37)*14;if(A(g,v,e+800,i,a,o,s,Q(e,41)*Math.PI*2,-1.6,Q(e,64)>.4),Q(e,66)>.4){let i=t+.05*(Q(e,68)>.5?1:-1),a=C+Math.cos(i)*(n-6),c=w+Math.sin(i)*(n-6);r.sceneryOk(a,c,o*.5+6)&&!j(a,c,o+4)&&A(h,v,e+900,a,c,o*.55,s*.6,Q(e,70)*Math.PI*2,-1.5,!1)}}for(let e=0;e<i.length&&S.count<b;e++){if(Q(e*13,Math.round(i[e].x))<.65)continue;let t=i[e],n=1.1+t.jitter*2.8;r.sceneryOk(t.x,t.z,n*.8)&&(o.position.set(t.x,n*.38,t.z),o.scale.set(n,n*(.65+t.jitter*.4),n),o.rotation.set(t.jitter*1.2,t.jitter*6,t.jitter*.8),o.updateMatrix(),S.setMatrixAt(S.count++,o.matrix))}for(let t of[m,h,g,_,v,y,S])t.count&&(t.instanceMatrix.needsUpdate=!0,t.computeBoundingSphere(),e.add(t));d[2]?.dispose(),_o(e,t,r,o,a,go(e,t,r,o,a))}n.props===`city`&&yo(e,t,r,o,a)}function fo(e,t,n,r,i,a,o,s,c){let l=new Ce,u=new I,d=new I,f=new I,p=new I(0,0,1),m=Math.max(.35,Math.min(1,a)),h=t.getLength(),g=new Y(1,1,1),_=new U({color:1842722,roughness:.88,metalness:.06}),v=new U({color:3817028,roughness:.82,metalness:.08}),y=new re(.46,.16,8,18),b=Math.min(900,Math.max(120,Math.floor(h/1.45*2*1.2*m))),S=new x(y,_,b);S.count=0,S.castShadow=!0,S.receiveShadow=!0;let C=new x(new re(.32,.055,6,14),v,b);C.count=0;let w=[],T=[],E=(e,t)=>{let i=Math.sqrt(r.minDist2(e,t));return i>=n+.82&&i<=n+2.15},D=(e,t)=>{for(let n=0;n<w.length;n++){let r=e-w[n],i=t-T[n];if(r*r+i*i<1.8225000000000002)return!1}return!0},O=(e,t)=>!!o?.(e,t),k=Math.max(80,Math.floor(h/1.4));for(let e=0;e<k;e++){let r=e/k%1;if(c?.(r))continue;t.getPointAt(r,u),t.getTangentAt(r,d).normalize(),f.set(-d.z,0,d.x);let i=n+1.28,a=(s?.(r)??0)+.46;if(!(a<.2||Math.abs(s?.(r)??0)>.12))for(let e of[-1,1]){let t=u.x+f.x*e*i,n=u.z+f.z*e*i;O(t,n)||!E(t,n)||!D(t,n)||S.count>=b||(l.quaternion.setFromUnitVectors(p,f),l.position.set(t,a,n),l.scale.set(1,1,1),l.updateMatrix(),S.setMatrixAt(S.count++,l.matrix),C.setMatrixAt(C.count++,l.matrix),w.push(t),T.push(n))}}S.instanceMatrix.needsUpdate=!0,C.instanceMatrix.needsUpdate=!0,S.computeBoundingSphere(),C.computeBoundingSphere(),e.add(S),e.add(C);let A=Math.floor(40*m),j=new x(y,_,A);j.count=0,l.quaternion.identity();for(let e=0;e<k&&j.count<A;e++){if(Q(e,23)>.08)continue;let i=e/k%1;t.getPointAt(i,u),t.getTangentAt(i,d).normalize(),f.set(-d.z,0,d.x);let a=Q(e,29)<.5?-1:1,o=n+3.2+Q(e,31)*1.6,s=u.x+f.x*a*o,c=u.z+f.z*a*o,p=Math.sqrt(r.minDist2(s,c));O(s,c)||p<n+2.4||p>n+6||(l.position.set(s,.16,c),l.rotation.set(Math.PI/2,Q(e,37)*6,0),l.scale.set(1,1,1),l.updateMatrix(),j.setMatrixAt(j.count++,l.matrix))}j.instanceMatrix.needsUpdate=!0,j.computeBoundingSphere(),e.add(j);let ee=new U({color:15886866,roughness:.55,metalness:.08}),te=new nt(.16,.48,8),ne=t.getPointAt(0),M=t.getTangentAt(0).normalize(),N=new I(-M.z,0,M.x);for(let t of[-1,1])for(let r=0;r<6;r++){let i=new J(te,ee);i.position.copy(ne).addScaledVector(N,t*(n+.4)).addScaledVector(M,-4+r*1.15),i.position.y=.24,e.add(i)}let ie=new U({color:10123848,roughness:1,metalness:.02,flatShading:!0}),P=new pe(1.2,6,5),F=Math.floor(22*m),ae=new x(P,ie,F);if(ae.count=0,!o){let e=ho(t,r,i,{count:F,minSep:11,clearFoot:2.8});for(let{x:t,z:n,i:r}of e){if(ae.count>=F)break;let e=1.5+Q(r,41)*2.4;l.position.set(t,e*.38,n),l.quaternion.identity(),l.scale.set(e,e*.55,e*.9),l.rotation.set(0,Q(r,43)*6,0),l.updateMatrix(),ae.setMatrixAt(ae.count++,l.matrix)}}ae.instanceMatrix.needsUpdate=!0,ae.computeBoundingSphere(),e.add(ae);let oe=[new U({color:12868124,roughness:.55,metalness:.25}),new U({color:3041946,roughness:.55,metalness:.25}),new U({color:3111498,roughness:.55,metalness:.22})],se=Math.floor(16*m),ce=oe.map(e=>{let t=new x(g,e,se);return t.count=0,t.castShadow=!0,t.receiveShadow=!0,t}),le=(e,t,n)=>{let r=ce[n%ce.length];r.count>=se||(l.quaternion.identity(),l.position.set(e,1.3,t),l.rotation.set(0,Q(n,47)*Math.PI,0),l.scale.set(6.1,2.55,2.45),l.updateMatrix(),r.setMatrixAt(r.count++,l.matrix))};ho(t,r,i,{count:o?0:Math.floor(8*m),minSep:16,clearFoot:4.4}).forEach(({x:e,z:t,i:n})=>le(e,t,n));for(let e=0;e<Math.floor(12*m);e++){let i=Q(e,53);t.getPointAt(i,u),t.getTangentAt(i,d).normalize(),f.set(-d.z,0,d.x);let a=Q(e,59)<.5?-1:1,o=u.x+f.x*a*(n+14+Q(e,61)*8),s=u.z+f.z*a*(n+14+Q(e,61)*8);O(o,s)||!r.sceneryOk(o,s,4.5)||le(o,s,e+40)}for(let t of ce)t.instanceMatrix.needsUpdate=!0,t.computeBoundingSphere(),e.add(t);let ue=(e,n,i)=>{for(let a=0;a<14;a++){let o=(Q(e,a+3)+a*.07)%1;t.getPointAt(o,u),t.getTangentAt(o,d).normalize(),f.set(-d.z,0,d.x);let s=Q(e,a+11)<.5?-1:1,c=u.x+f.x*s*n,l=u.z+f.z*s*n;if(!(O(c,l)||!r.sceneryOk(c,l,i)))return{x:c,z:l,yaw:Math.atan2(d.x,d.z)}}return null},de=new U({color:2976568,roughness:.55,metalness:.18}),fe=new U({color:1985062,roughness:.5,metalness:.2}),R=(t,n,r)=>{let i=new V,a=new J(new Y(2.6,1.15,1.45),de);a.position.y=.62,i.add(a);let o=new J(new Y(2.72,.12,1.55),fe);o.position.y=1.22,i.add(o);let s=new J(new Y(1.2,.08,1.5),fe);s.position.set(-.55,1.42,0),s.rotation.z=-.45,i.add(s),i.position.set(t,0,n),i.rotation.y=r,e.add(i)};for(let e=0;e<Math.floor(5*m);e++){let t=ue(200+e,n+12+e*.8,2.2);t&&R(t.x,t.z,t.yaw)}let z=new U({color:3833540,roughness:.48,metalness:.12}),me=new U({color:15265524,roughness:.55,metalness:.08});for(let t=0;t<Math.floor(4*m);t++){let r=ue(310+t,n+11,1.2);if(!r)continue;let i=new V,a=new J(new Y(1.05,2.25,1.05),z);a.position.y=1.15,i.add(a);let o=new J(new Y(.72,1.7,.06),me);o.position.set(0,1.05,.54),i.add(o);let s=new J(new Y(.35,.12,.35),me);s.position.y=2.32,i.add(s),i.position.set(r.x,0,r.z),i.rotation.y=r.yaw,e.add(i)}let he=new U({color:11569480,roughness:.82,metalness:.04});for(let t=0;t<Math.floor(5*m);t++){let r=ue(410+t,n+13,1.8);if(!r)continue;let i=new V;for(let e=0;e<6;e++){let t=new J(new Y(2.4,.1,.18),he);t.position.set(0,.08+e*.12,e%2*.04),i.add(t)}i.position.set(r.x,0,r.z),i.rotation.y=r.yaw,e.add(i)}let ge=new U({color:9080984,roughness:.35,metalness:.7}),_e=new L(.12,.12,2.8,8);for(let t=0;t<Math.floor(4*m);t++){let r=ue(510+t,n+12.5,1.6);if(!r)continue;let i=new V;for(let e=0;e<5;e++){let t=new J(_e,ge);t.rotation.z=Math.PI/2,t.position.set(0,.14+e%2*.22,-.35+e*.18),i.add(t)}i.position.set(r.x,0,r.z),i.rotation.y=r.yaw,e.add(i)}let ve=new U({color:10123850,roughness:.85,metalness:.05});for(let t=0;t<Math.floor(4*m);t++){let r=ue(610+t,n+11.5,1.4);if(!r)continue;let i=new V,a=new J(new Y(1.3,.08,1.1),ve);a.position.y=.14,i.add(a);for(let e of[-.5,0,.5]){let t=new J(new Y(.12,.1,1.1),ve);t.position.set(e,.06,0),i.add(t)}i.position.set(r.x,0,r.z),i.rotation.y=r.yaw,e.add(i)}let ye=ue(700,n+16,3.2);if(ye){let t=new V,n=new J(new Y(3.4,1.1,1.6),new U({color:13157552,roughness:.55,metalness:.2}));n.position.y=.85,t.add(n);let r=new J(new L(.72,.85,2.1,10),new U({color:15777824,roughness:.4,metalness:.35}));r.rotation.z=.55,r.position.set(.35,1.85,0),t.add(r),t.position.set(ye.x,0,ye.z),t.rotation.y=ye.yaw,e.add(t)}let be=ue(740,n+17,3.5);if(be){let t=new V,n=new U({color:15769632,roughness:.45,metalness:.22}),r=new U({color:3817544,roughness:.4,metalness:.55}),i=new J(new Y(2.2,1.4,1.6),n);i.position.y=1.15,t.add(i);let a=new J(new Y(1.1,1,1.4),new U({color:1713200,roughness:.35,metalness:.15}));a.position.set(-.35,2.05,0),t.add(a);let o=new J(new Y(2.4,.28,.28),r);o.position.set(1.6,1.7,0),o.rotation.z=-.45,t.add(o);let s=new J(new Y(1.6,.22,.22),r);s.position.set(2.85,1.15,0),s.rotation.z=.7,t.add(s);let c=new J(new Y(.7,.45,.8),r);c.position.set(3.45,.45,0),t.add(c),t.position.set(be.x,0,be.z),t.rotation.y=be.yaw,e.add(t)}let xe=ue(780,n+15,1.5);if(xe){let t=new V,n=new J(new L(.08,.12,8.5,6),new U({color:9080984,roughness:.4,metalness:.6}));n.position.y=4.25,t.add(n);let r=new J(new Y(.9,.35,.55),new U({color:16052440,roughness:.3,emissive:16773828,emissiveIntensity:.35}));r.position.set(.4,8.3,0),t.add(r),t.position.set(xe.x,0,xe.z),t.rotation.y=xe.yaw,e.add(t)}let Se=new U({color:13157560,roughness:.7,metalness:.05}),we=Math.floor(36*m),Te=new x(g,Se,we);Te.count=0;for(let e=0;e<k&&Te.count<we;e++){if(Q(e,71)>.08)continue;let r=e/k%1;t.getPointAt(r,u),t.getTangentAt(r,d).normalize(),f.set(-d.z,0,d.x);let i=Q(e,73)<.5?-1:1;l.quaternion.identity(),l.position.set(u.x+f.x*i*(n+3.1),.45,u.z+f.z*i*(n+3.1)),!O(l.position.x,l.position.z)&&(l.rotation.set(0,Math.atan2(d.x,d.z),0),l.scale.set(1.8,.9,.42),l.updateMatrix(),Te.setMatrixAt(Te.count++,l.matrix))}Te.instanceMatrix.needsUpdate=!0,Te.computeBoundingSphere(),e.add(Te);let B=new U({color:15777824,roughness:.4,metalness:.55}),Ee=new U({color:3817544,roughness:.45,metalness:.5}),De=ue(90,n+24,8)??{x:i.cx+28,z:i.cz+22,yaw:.4},Oe=new V,ke=new J(new Y(1.1,32,1.1),B);ke.position.y=16,Oe.add(ke);let Ae=new J(new Y(36,.7,.7),B);Ae.position.set(11,31.2,0),Oe.add(Ae);let je=new J(new Y(8,.7,.7),B);je.position.set(-6,31.2,0),Oe.add(je);let Me=new J(new Y(2.4,1.7,2.4),Ee);Me.position.set(0,30.2,0),Oe.add(Me);let Ne=new J(new Y(.35,5.2,.35),Ee);Ne.position.set(24,28.2,0),Oe.add(Ne),Oe.position.set(De.x,0,De.z),Oe.rotation.y=De.yaw,e.add(Oe);let Pe=new U({color:12106946,roughness:.4,metalness:.65}),H=(t,n,r)=>{let i=new V;for(let e of[-1.1,1.1]){let t=new J(new Y(.12,6.2,.12),Pe);t.position.set(e,3.1,0),i.add(t)}for(let e of[1.9,3.8,5.6]){let t=new J(new Y(2.4,.1,.1),Pe);t.position.set(0,e,0),i.add(t)}i.position.set(t,0,n),i.rotation.y=r,e.add(i)};for(let e=0;e<Math.floor(5*m);e++){let t=ue(820+e,n+14,2.4);t&&H(t.x,t.z,t.yaw)}let W=new U({color:7239294,roughness:.42,metalness:.58}),Fe=new U({color:12762804,roughness:.9,metalness:.06}),G=new U({color:12886106,roughness:.78,metalness:.04}),Ie=new U({color:15227410,roughness:.7,metalness:.05,transparent:!0,opacity:.42,side:2}),Le=new U({color:9080984,roughness:.4,metalness:.6}),Re=new U({color:16052440,roughness:.3,emissive:16773828,emissiveIntensity:.35}),ze=new Y(.28,1,.28),K=new Y(1,.2,.2),Be=new Y(1,1,1),Ve=[{x:De.x,z:De.z,r:10}],q=(e,t,n)=>{for(let r of Ve){let i=e-r.x,a=t-r.z;if(i*i+a*a<(n+r.r)*(n+r.r))return!1}return!0},He=(e,n,i)=>{for(let a=0;a<10;a++){let o=(e+a*.04)%1;t.getPointAt(o,u),t.getTangentAt(o,d).normalize(),f.set(-d.z,0,d.x);for(let e of[-1,1])for(let t of[0,5,10,16]){let a=u.x+f.x*e*(n+t),o=u.z+f.z*e*(n+t);if(!(O(a,o)||!r.sceneryOk(a,o,i)||!q(a,o,i)))return Ve.push({x:a,z:o,r:i}),{x:a,z:o,yaw:Math.atan2(d.x,d.z)}}}return null},Ue=(e,n,i)=>{for(let a=0;a<22;a++){let o=(Q(e,a+3)+a*.047)%1;t.getPointAt(o,u),t.getTangentAt(o,d).normalize(),f.set(-d.z,0,d.x);let s=Q(e,a+11)<.5?-1:1,c=n+Q(e,a+19)*6,l=u.x+f.x*s*c,p=u.z+f.z*s*c;if(!(O(l,p)||!r.sceneryOk(l,p,i)||!q(l,p,i)))return Ve.push({x:l,z:p,r:i}),{x:l,z:p,yaw:Math.atan2(d.x,d.z)}}return null},We=(t,n,r,i,a,o,s,c)=>{let l=new V,u=4.4,d=3.35,f=i*u,p=a*u,m=o*d,h=new J(Be,Fe);h.position.y=.12,h.scale.set(f+1.4,.24,p+1.4),l.add(h);for(let e=0;e<=i;e++)for(let t=0;t<=a;t++){let n=new J(ze,W);n.position.set(-f*.5+e*u,m*.5,-p*.5+t*u),n.scale.set(1,m,1),l.add(n)}for(let e=1;e<=o;e++){let t=e*d;for(let e=0;e<=a;e++){let n=new J(K,W);n.position.set(0,t,-p*.5+e*u),n.scale.set(f+.2,1,1),l.add(n)}for(let e=0;e<=i;e++){let n=new J(K,W);n.position.set(-f*.5+e*u,t,0),n.rotation.y=Math.PI/2,n.scale.set(p+.2,1,1),l.add(n)}if(e<=s){let n=new J(Be,Fe);n.position.y=t-.1;let r=e===s?.82:.96;n.scale.set(f*r,.16,p*r),l.add(n)}}if(c){let e=d*.92,t=new J(Be,G);t.position.set(0,e*.5,p*.5+.08),t.scale.set(f*.92,e,.08),l.add(t);let n=new J(Be,G);n.position.set(-f*.5-.08,e*.5,0),n.scale.set(.08,e,p*.7),l.add(n);let r=new J(Be,Ie);r.position.set(f*.5+.06,m*.42,0),r.scale.set(.05,m*.78,p*.9),l.add(r)}else for(let e=0;e<Math.min(o,3);e++){let t=new J(K,W);t.position.set(0,e*d+d*.5,-p*.5),t.rotation.z=e%2==0?.55:-.55,t.scale.set(u*1.15,.7,.7),l.add(t)}if(o>=4){let e=new J(Be,Fe);e.position.set(-f*.5+u*.5,m*.55,-p*.5+u*.5),e.scale.set(u*.7,m*1.1,u*.7),l.add(e)}return l.position.set(t,0,n),l.rotation.y=r,e.add(l),{w:f,d:p}},Ge=[{u:.14,dist:n+30,foot:11,baysX:3,baysZ:2,floors:5,slabUntil:2,clad:!1},{u:.47,dist:n+28,foot:10,baysX:3,baysZ:2,floors:3,slabUntil:2,clad:!0},{u:.78,dist:n+32,foot:12,baysX:4,baysZ:2,floors:2,slabUntil:1,clad:!1}],Ke=[{x:i.maxX+8,z:i.cz-16,yaw:.15},{x:i.minX-8,z:i.cz+8,yaw:Math.PI*.92},{x:i.cx+12,z:i.maxZ+8,yaw:1.2}];for(let e=0;e<Ge.length;e++){let t=Ge[e],n=He(t.u,t.dist,t.foot);if(!n){let i=Ke[e];!O(i.x,i.z)&&r.sceneryOk(i.x,i.z,t.foot)&&q(i.x,i.z,t.foot)&&(Ve.push({x:i.x,z:i.z,r:t.foot}),n=i)}if(!n)continue;let i=We(n.x,n.z,n.yaw,t.baysX,t.baysZ,t.floors,t.slabUntil,t.clad),a=n.x+Math.sin(n.yaw)*(i.d*.5+1.9),o=n.z+Math.cos(n.yaw)*(i.d*.5+1.9);!O(a,o)&&r.sceneryOk(a,o,2.2)&&q(a,o,2.2)&&(Ve.push({x:a,z:o,r:2.2}),H(a,o,n.yaw))}let qe=(t,n,r)=>{let i=new V,a=new J(new L(.08,.12,8.5,6),Le);a.position.y=4.25,i.add(a);let o=new J(new Y(.9,.35,.55),Re);o.position.set(.4,8.3,0),i.add(o),i.position.set(t,0,n),i.rotation.y=r,e.add(i)};for(let e=0;e<Math.floor(3*m);e++){let t=Ue(860+e,n+17+e*2,1.5);t&&qe(t.x,t.z,t.yaw)}for(let e=0;e<Math.floor(3*m);e++){let t=Ue(880+e,n+18,2.2);t&&R(t.x,t.z,t.yaw)}for(let t=0;t<Math.floor(2*m);t++){let r=Ue(900+t,n+16,1.2);if(!r)continue;let i=new V,a=new J(new Y(1.05,2.25,1.05),z);a.position.y=1.15,i.add(a);let o=new J(new Y(.72,1.7,.06),me);o.position.set(0,1.05,.54),i.add(o);let s=new J(new Y(.35,.12,.35),me);s.position.y=2.32,i.add(s),i.position.set(r.x,0,r.z),i.rotation.y=r.yaw,e.add(i)}for(let t=0;t<Math.floor(2*m);t++){let r=Ue(920+t,n+17,1.8);if(!r)continue;let i=new V;for(let e=0;e<6;e++){let t=new J(new Y(2.4,.1,.18),he);t.position.set(0,.08+e*.12,e%2*.04),i.add(t)}i.position.set(r.x,0,r.z),i.rotation.y=r.yaw,e.add(i)}for(let t=0;t<Math.floor(2*m);t++){let r=Ue(940+t,n+16.5,1.6);if(!r)continue;let i=new V;for(let e=0;e<5;e++){let t=new J(_e,ge);t.rotation.z=Math.PI/2,t.position.set(0,.14+e%2*.22,-.35+e*.18),i.add(t)}i.position.set(r.x,0,r.z),i.rotation.y=r.yaw,e.add(i)}for(let t=0;t<Math.floor(2*m);t++){let r=Ue(960+t,n+16,1.4);if(!r)continue;let i=new V,a=new J(new Y(1.3,.08,1.1),ve);a.position.y=.14,i.add(a);for(let e of[-.5,0,.5]){let t=new J(new Y(.12,.1,1.1),ve);t.position.set(e,.06,0),i.add(t)}i.position.set(r.x,0,r.z),i.rotation.y=r.yaw,e.add(i)}for(let e=0;e<Math.floor(3*m);e++){let t=Ue(980+e,n+19,2.4);t&&H(t.x,t.z,t.yaw)}let Je=Math.floor(6*m),Ye=new x(P,ie,Je);Ye.count=0,Ye.castShadow=!0,Ye.receiveShadow=!0;for(let e=0;e<16&&Ye.count<Je;e++){let t=Ue(1e3+e,n+18+e%3*2,2.6);if(!t)continue;let r=1.6+Q(e,81)*2.2;l.position.set(t.x,r*.38,t.z),l.quaternion.identity(),l.scale.set(r,r*.55,r*.9),l.rotation.set(0,Q(e,83)*6,0),l.updateMatrix(),Ye.setMatrixAt(Ye.count++,l.matrix)}Ye.instanceMatrix.needsUpdate=!0,Ye.computeBoundingSphere(),e.add(Ye)}function po(e,t,n,r,i){let a=new I,o=new I,s=new Y(1,1,1),c=[new U({color:12085810,roughness:.96,metalness:.04,flatShading:!0}),new U({color:12876346,roughness:.95,metalness:.04,flatShading:!0}),new U({color:10114344,roughness:.97,metalness:.03,flatShading:!0}),new U({color:13931082,roughness:.94,metalness:.05,flatShading:!0})],l=new U({color:14725232,roughness:.9,metalness:.04,flatShading:!0}),u=c.map(e=>{let t=new x(s,e,384);return t.count=0,t.castShadow=!1,t.receiveShadow=!0,t}),d=new x(s,l,192);d.count=0,d.castShadow=!1;for(let e=0;e<96;e++){let i=e/96,s=t.getPointAt(i);a.copy(t.getTangentAt(i)).normalize(),o.set(-a.z,0,a.x);let l=Math.atan2(a.x,a.z);for(let t of[-1,1]){let i=10+Q(e,3+t)*8,a=14+Q(e,5+t)*6,f=16+Q(e,7+t)*22,p=n.runoffClear+2.2+i*.5,m=s.x+o.x*t*p,h=s.z+o.z*t*p;if(!n.outsideRunoff(m,h,i*.5+.6))continue;let g=Math.floor(Q(e*3+t,11)*c.length)%c.length,_=u[g];if(_.count>=_.instanceMatrix.count)continue;r.position.set(m,f*.48,h),r.scale.set(a,f,i),r.rotation.set(0,l+(Q(e,13)-.5)*.08,0),r.updateMatrix(),_.setMatrixAt(_.count++,r.matrix),d.count<d.instanceMatrix.count&&(r.position.set(m,f*.78,h),r.scale.set(a*.98,f*.1,i*.98),r.updateMatrix(),d.setMatrixAt(d.count++,r.matrix));let v=14+Q(e,17+t)*12,y=22+Q(e,19+t)*28,b=p+i*.55+v*.45,x=s.x+o.x*t*b,S=s.z+o.z*t*b,C=u[(g+1)%c.length];C.count>=C.instanceMatrix.count||(r.position.set(x,y*.45,S),r.scale.set(a*1.15,y,v),r.rotation.set(0,l+(Q(e,23)-.5)*.12,0),r.updateMatrix(),C.setMatrixAt(C.count++,r.matrix))}}for(let t of u)t.count&&(t.instanceMatrix.needsUpdate=!0,t.computeBoundingSphere(),e.add(t));d.count&&(d.instanceMatrix.needsUpdate=!0,d.computeBoundingSphere(),e.add(d));let f=c[0],p=new x(s,f,28);p.count=0,p.castShadow=!1,p.receiveShadow=!0;let m=i.cx,h=i.cz,g=Math.max(i.spanX,i.spanZ)*.55+40;for(let e=0;e<28;e++){let t=e/28*Math.PI*2+Q(e,29)*.4,i=g+Q(e,31)*35,a=m+Math.cos(t)*i,o=h+Math.sin(t)*i;if(!n.sceneryOk(a,o,12))continue;let s=8+Q(e,37)*14,c=12+Q(e,41)*20;r.position.set(a,c*.5,o),r.scale.set(s,c,s*(.7+Q(e,43)*.5)),r.rotation.set(0,Q(e,47)*6,0),r.updateMatrix(),p.setMatrixAt(p.count++,r.matrix)}p.count&&(p.instanceMatrix.needsUpdate=!0,p.computeBoundingSphere(),e.add(p))}function mo(e,t,n,r){let i=r.cx,a=r.cz;if(!n.insideLoop(i,a)||!n.clearOf(i,a,12)){let e=ho(t,n,r,{count:48,minSep:10,clearFoot:8});if(!e.length)return;i=0,a=0;for(let t of e)i+=t.x,a+=t.z;i/=e.length,a/=e.length}if(!n.insideLoop(i,a)||!n.clearOf(i,a,10))return;let o=new V;o.name=`canyon-secret-lodge`,o.position.set(i,0,a),o.rotation.y=0;let s=new U({color:12876346,roughness:.94,metalness:.04,flatShading:!0}),c=new U({color:10114344,roughness:.96,metalness:.03,flatShading:!0}),l=new U({color:13931082,roughness:.92,metalness:.04,flatShading:!0}),u=new U({color:4861984,roughness:.88,metalness:.05,flatShading:!0}),d=new U({color:12085810,roughness:.98,metalness:.02,flatShading:!0}),f=new U({color:9121311,roughness:.9,metalness:.02,flatShading:!0}),p=new U({color:16769184,emissive:16760928,emissiveIntensity:1.4,roughness:.4,metalness:.1});p.userData.nightLamp=!0,p.userData.emissiveDay=1.4,p.userData.emissiveNight=4.2;let m=(e,t,n,r,i,a,o,s)=>{let c=new J(new Y(t,n,r),i);return c.position.set(a,o,s),c.castShadow=!0,c.receiveShadow=!0,e.add(c),c},h=.7,g=5.2,_=3.4,v=3.6;m(o,14.6,.28,11.6,c,0,.14,0),m(o,14-h*2-.05,.12,11-h*2-.05,d,0,.32,0),m(o,14,g,h,s,0,2.88,-5.15),m(o,h,g,11,l,-6.65,2.88,0),m(o,h,g,11,l,14*.5-h*.5,2.88,0);let y=11*.5-h*.5,b=(14-_)*.5;m(o,b,g,h,s,-4.35,2.88,y),m(o,b,g,h,s,14*.5-b*.5,2.88,y),m(o,3.6,g-v,h,c,0,4.680000000000001,y),m(o,.22,v,.28,u,-3.4*.5,2.08,5.300000000000001),m(o,.22,v,.28,u,_*.5,2.08,5.300000000000001),m(o,3.84,.22,.28,u,0,3.88,5.300000000000001),m(o,15.4,.45,12.4,c,0,5.7,0),m(o,14.9,.55,.35,s,0,6.15,-11*.5-.2),m(o,14.9,.55,.35,s,0,6.15,5.7),m(o,.35,.55,11.9,s,-14*.5-.2,6.15,0),m(o,.35,.55,11.9,s,7.2,6.15,0);let x=(e,t)=>{let n=new J(new Y(.12,1.1,1.6),p);n.position.set(e,2.4,t),o.add(n)};x(-6.67,-2.2),x(-6.67,2.2),x(6.67,-2.2),x(6.67,2.2),m(o,4.2,.06,3.2,f,0,.42,-.6),m(o,2.4,.7,1.1,u,0,.8,-1.8),m(o,.9,.9,.9,c,-3.6,.85,-2.8),m(o,.7,.7,.7,c,-3.4,1.55,-2.8),m(o,.85,.85,.85,c,3.5,.8,2.4);let S=new J(new Y(.45,.45,.45),p);S.position.set(0,4.2,0),o.add(S);let C=new he(16760944,.55,14,2);C.position.set(0,3.6,0),C.castShadow=!1,o.add(C);for(let e=0;e<5;e++){let t=.55+e%2*.2;m(o,t,.12,t*.85,c,(e%2==0?-.7:.7)*.5,.06,6.7+e*1.05)}for(let[e,t]of[[-14*.5-.35,-11*.5-.35],[7.35,-11*.5-.35],[-14*.5-.35,5.85],[7.35,5.85]])m(o,1.1,g*.85,1.1,c,e,g*.42,t);e.add(o)}function ho(e,t,n,r){let i=n.minX+48,a=n.maxX-48,o=n.minZ+48,s=n.maxZ-48,c=Math.max(1,a-i),l=Math.max(1,s-o),u=r.minSep??7.5,d=u*u,f=r.clearFoot??2.4,p=Math.max(u*.9,Math.sqrt(c*l/Math.max(12,r.count*2.2))),m=[],h=0;for(let e=i;e<=a;e+=p)for(let n=o;n<=s;n+=p){h+=1;let i=e+(Q(h,3)-.5)*p*.85,a=n+(Q(h,5)-.5)*p*.85;if(!t.insideLoop(i,a)||!t.clearOf(i,a,f)||r.exclude?.(i,a))continue;let o=!0;for(let e of m){let t=e.x-i,n=e.z-a;if(t*t+n*n<d){o=!1;break}}o&&m.push({x:i,z:a,i:h})}if(m.length<=r.count)return m;let g=[];for(let e=0;e<r.count;e++){let t=Math.min(m.length-1,Math.floor((e+.5)*m.length/r.count));g.push(m[t])}return g}function go(e,t,n,r,i){let a=ho(t,n,i,{count:175,minSep:4.4,clearFoot:2.5});if(!a.length)return[];let o=Fa.pines,s=new L(.2,.28,2.2,5),c=new nt(1.1,2.6,6),l=a.length,u=new x(s,o.trunk,l);u.count=0,u.castShadow=!1,u.userData.sharedVegMat=!0;let d=o.canopy.map(e=>{let t=new x(c,e,l);return t.count=0,t.castShadow=!1,t.userData.sharedVegMat=!0,t}),f=o.canopy.map(e=>{let t=new x(c,e,l);return t.count=0,t.castShadow=!1,t.userData.sharedVegMat=!0,t});for(let{x:e,z:t,i:n}of a){let i=.7+Q(n,7)*.65;r.position.set(e,1.1*i,t),r.scale.set(i,i,i),r.rotation.set(0,Q(n,11)*6,0),r.updateMatrix(),u.setMatrixAt(u.count++,r.matrix);let a=Math.floor(Q(n,13)*d.length)%d.length,o=d[a],s=i*(1.05+Q(n,17)*.25);r.position.set(e,2.2*i,t),r.scale.set(s,s*1.25,s),r.updateMatrix(),o.setMatrixAt(o.count++,r.matrix);let c=f[a];r.position.set(e,2.2*i+1.1*i,t),r.scale.set(s*.62,s*.95,s*.62),r.updateMatrix(),c.setMatrixAt(c.count++,r.matrix)}u.instanceMatrix.needsUpdate=!0,u.computeBoundingSphere(),e.add(u);for(let t of[...d,...f])t.count&&(t.instanceMatrix.needsUpdate=!0,t.computeBoundingSphere(),e.add(t));return a}function _o(e,t,n,r,i,a){let o=ho(t,n,i,{count:85,minSep:3.6,clearFoot:1.4,exclude:(e,t)=>{for(let n of a){let r=n.x-e,i=n.z-t;if(r*r+i*i<7.839999999999999)return!0}return!1}});if(!o.length)return;let s=new U({color:9082014,roughness:.93,metalness:.04,flatShading:!0,emissive:3160132,emissiveIntensity:.06}),c=new x(new De(1,0),s,o.length);c.count=0,c.castShadow=!1,c.receiveShadow=!0,c.frustumCulled=!0;for(let{x:e,z:t,i:n}of o){let i=.45+Q(n,19)*1.15;r.position.set(e,i*.38,t),r.scale.set(i,i*(.55+Q(n,23)*.4),i),r.rotation.set(Q(n,29)*1.2,Q(n,31)*6,Q(n,37)*.8),r.updateMatrix(),c.setMatrixAt(c.count++,r.matrix)}c.count&&(c.instanceMatrix.needsUpdate=!0,c.computeBoundingSphere(),e.add(c))}function vo(e){let t=document.createElement(`canvas`);t.width=64,t.height=64;let n=t.getContext(`2d`);n.fillStyle=e.wall,n.fillRect(0,0,64,64),n.fillStyle=e.frame,n.fillRect(0,64*.86,64,64*.14);let r=64*.06,i=64*.05,a=56.32/e.cols,o=49.92/e.rows,s=a*.22,c=o*.28;for(let t=0;t<e.rows;t++)for(let l=0;l<e.cols;l++){n.fillStyle=Q(e.seed+t*17+l,e.seed+41)<e.litChance?e.lit:e.dark;let u=r+l*a+s*.5,d=i+t*o+c*.5;n.fillRect(u,d,a-s,o-c)}n.strokeStyle=e.frame,n.lineWidth=1;for(let t=1;t<e.cols;t++){let e=r+t*a;n.beginPath(),n.moveTo(e,i),n.lineTo(e,53.120000000000005),n.stroke()}let l=new D(t);return l.colorSpace=te,l.wrapS=Lt,l.wrapT=Lt,l.magFilter=Rt,l.minFilter=Rt,l.generateMipmaps=!1,l}function yo(e,t,n,r,i){let a=new I,o=new I,s=new Y(1,1,1),c=new L(.12,.16,1,5),l=[{roughness:.88,metalness:.05,map:vo({wall:`#c4b49a`,frame:`#9a8a72`,lit:`#ffe8a8`,dark:`#3a4a58`,cols:5,rows:7,seed:11,litChance:.35}),repeatY:1.2},{roughness:.92,metalness:.04,map:vo({wall:`#9a5a48`,frame:`#6e3e32`,lit:`#ffd090`,dark:`#2a3038`,cols:4,rows:6,seed:23,litChance:.28}),repeatY:1},{roughness:.82,metalness:.12,map:vo({wall:`#8a929c`,frame:`#5a626c`,lit:`#d8ecff`,dark:`#1e2834`,cols:6,rows:8,seed:37,litChance:.42}),repeatY:1.4},{roughness:.55,metalness:.32,emissive:1714232,emissiveIntensity:.22,map:vo({wall:`#4a5a6e`,frame:`#2e3a48`,lit:`#a8d4ff`,dark:`#121820`,cols:5,rows:9,seed:53,litChance:.5}),repeatY:1.6},{roughness:.6,metalness:.28,emissive:2365456,emissiveIntensity:.28,map:vo({wall:`#2e343c`,frame:`#1a1e24`,lit:`#ffc878`,dark:`#0c1014`,cols:4,rows:10,seed:71,litChance:.55}),repeatY:1.8},{roughness:.9,metalness:.03,map:vo({wall:`#d2c8b4`,frame:`#a89c88`,lit:`#fff0c0`,dark:`#3a4854`,cols:4,rows:5,seed:89,litChance:.3}),repeatY:.9}].map(e=>{let t=e.map.clone();t.repeat.set(1,e.repeatY),t.needsUpdate=!0;let n=e.emissiveIntensity??0,r=new U({color:16777215,map:t,roughness:e.roughness,metalness:e.metalness,emissive:e.emissive??16771232,emissiveMap:t,emissiveIntensity:n});return r.userData.nightLamp=!0,r.userData.emissiveDay=n,r.userData.emissiveNight=Math.max(.85,n+.95),r}),u=new U({color:6207700,roughness:.18,metalness:.62,transparent:!0,opacity:.55,emissive:1720408,emissiveIntensity:.15}),d=new U({color:3840652,roughness:.2,metalness:.58,transparent:!0,opacity:.58,emissive:667688,emissiveIntensity:.12}),f=new U({color:2764856,roughness:.95,metalness:.08}),p=new U({color:4864562,roughness:.92,metalness:.06}),m=new U({color:5923436,roughness:.7,metalness:.35}),h=new U({color:6977672,roughness:.55,metalness:.4}),g=new U({color:5922920,roughness:.9,metalness:.05}),_=new U({color:2764856,metalness:.55,roughness:.45}),v=Ma(.28,6),y=(e,r)=>{let i=t.getPointAt(e);a.copy(t.getTangentAt(e)).normalize(),o.set(-a.z,0,a.x);let s=i.x+o.x*r,c=i.z+o.z*r;return n.insideLoop(s,c)?-1:1},b=new x(s,g,80);b.count=0;for(let e=0;e<80;e++){let i=e/80,s=n.runoffClear+1.1,c=y(i,s),l=t.getPointAt(i);a.copy(t.getTangentAt(i)).normalize(),o.set(-a.z,0,a.x);let u=l.x+o.x*c*s,d=l.z+o.z*c*s;n.insideLoop(u,d)||n.outsideRunoff(u,d,.6)&&(r.position.set(u,.18,d),r.scale.set(4.2,.28,1.1),r.rotation.set(0,Math.atan2(a.x,a.z),0),r.updateMatrix(),b.setMatrixAt(b.count++,r.matrix))}b.instanceMatrix.needsUpdate=!0,b.computeBoundingSphere(),e.add(b);let S=new x(c,_,36),C=new x(new pe(.32,6,6),v,36);S.count=0,C.count=0;for(let i=0;i<36;i++){let s=(i+.5)/36,c=n.runoffClear+2.4,l=y(s,c),u=t.getPointAt(s);a.copy(t.getTangentAt(s)).normalize(),o.set(-a.z,0,a.x);let d=u.x+o.x*l*c,f=u.z+o.z*l*c;n.insideLoop(d,f)||!n.outsideRunoff(d,f,.8)||(r.position.set(d,3.4,f),r.scale.set(1,6.8,1),r.rotation.set(0,0,0),r.updateMatrix(),S.setMatrixAt(S.count++,r.matrix),r.position.set(d,6.9,f),r.scale.set(1,1,1),r.updateMatrix(),C.setMatrixAt(C.count++,r.matrix),C.count%2==1&&e.add(Na(d,6.5,f,1.75,24)))}S.instanceMatrix.needsUpdate=!0,C.instanceMatrix.needsUpdate=!0,S.computeBoundingSphere(),C.computeBoundingSphere(),e.add(S),e.add(C);let w=Math.ceil(150/l.length)+8,T=l.map(e=>{let t=new x(s,e,w);return t.count=0,t.castShadow=!1,t.receiveShadow=!0,t}),E=l.map(e=>{let t=new x(s,e,83);return t.count=0,t.castShadow=!1,t.receiveShadow=!0,t}),D=new x(s,u,55);D.count=0,D.castShadow=!1;let O=new x(s,d,28);O.count=0,O.castShadow=!1;let k=new x(s,f,170),A=new x(s,p,68);k.count=0,A.count=0,k.castShadow=!1,A.castShadow=!1;let j=new x(s,m,210);j.count=0,j.castShadow=!1;let ee=new x(s,h,53);ee.count=0,ee.castShadow=!1;let te=(e,t,n,i,a,o,s,c)=>e.count>=e.instanceMatrix.count?!1:(r.position.set(t,n,i),r.scale.set(a,o,s),r.rotation.set(0,c,0),r.updateMatrix(),e.setMatrixAt(e.count++,r.matrix),!0),ne=0;for(let e=0;e<450&&ne<150;e++){let r=e*.271%1,i=e%3,s=n.runoffClear+14+i*16+Q(e,5)*10,c=y(r,s),u=t.getPointAt(r);a.copy(t.getTangentAt(r)).normalize(),o.set(-a.z,0,a.x);let d=(Q(e,7)-.5)*12,f=u.x+o.x*c*s+a.x*d,p=u.z+o.z*c*s+a.z*d,m=Q(e,11),h,g;if(m<.28)h=9+Q(e,12)*12,g=5+Q(e,13)*6;else if(m<.55)h=5+Q(e,12)*6,g=9+Q(e,13)*11;else if(m<.78){let t=6+Q(e,12)*8;h=t,g=t*(.85+Q(e,13)*.3)}else h=4+Q(e,12)*4,g=4+Q(e,13)*4;let _=i===2?52:i===1?36:20,v=i===2?14:i===1?10:6,b=v+Q(e,17)*(_-v);i===0&&(b*=.85);let x=Math.max(h,g)*.55;if(n.insideLoop(f,p)||!n.sceneryOk(f,p,x))continue;let S=Math.floor(Q(e,19)*l.length)%l.length,C=T[S];if(C.count>=C.instanceMatrix.count)continue;let w=Math.atan2(a.x,a.z)+(Q(e,23)>.65?Math.PI*.5:0),M=b>18&&Q(e,31)>.38,re=M?b*(.55+Q(e,33)*.18):b,N=M?b-re:0;if(!te(C,f,re*.5,p,h,re,g,w))continue;ne+=1;let ie=re,P=h,F=g;if(M&&N>3){let t=E[S],n=h*(.55+Q(e,35)*.25),r=g*(.55+Q(e,37)*.25);te(t,f,re+N*.5,p,n,N,r,w)&&(ie=re+N,P=n,F=r)}let ae=S===3||S===4||Q(e,29)>.72;if(b>22&&ae){let t=Q(e,41)>.55?D:O,n=M?N*.92||re*.65:re*.72;te(t,f,M&&N>3?re+n*.5:n*.55+re*.08,p,(M?P:h)*.94,n,(M?F:g)*.94,w)}let oe=.35+Q(e,43)*.35;if(te(Q(e,45)>.55?k:A,f,ie+oe*.5,p,P*1.02,oe,F*1.02,w),b>12&&j.count+1<j.instanceMatrix.count&&Q(e,47)>.32){let t=P*(.22+Q(e,49)*.28),n=F*(.2+Q(e,51)*.25),r=1.2+Q(e,53)*2.2,i=(Q(e,55)-.5)*P*.35,a=(Q(e,57)-.5)*F*.35,o=Math.cos(w),s=Math.sin(w),c=f+i*o+a*s,l=p-i*s+a*o;if(te(j,c,ie+oe+r*.5,l,t,r,n,w),P*F>80&&j.count<j.instanceMatrix.count&&Q(e,59)>.45){let t=P*.18,n=F*.16,r=.8+Q(e,61)*1.4,i=(Q(e,63)-.5)*P*.4,a=(Q(e,65)-.5)*F*.4,c=f+i*o+a*s,l=p-i*s+a*o;te(j,c,ie+oe+r*.5,l,t,r,n,w)}}if(b>36&&ee.count<ee.instanceMatrix.count&&Q(e,67)>.55){let t=3+Q(e,69)*5;te(ee,f,ie+oe+t*.5,p,.35,t,.35,w)}}for(let t of[...T,...E])t.count&&(t.instanceMatrix.needsUpdate=!0,t.computeBoundingSphere(),e.add(t));for(let t of[D,O,k,A,j,ee])t.count&&(t.instanceMatrix.needsUpdate=!0,t.computeBoundingSphere(),e.add(t));To(e,t,n,r,i)}function bo(e,t,n,r=96){let i=new I,a=new I,o=[],s=t.runoffClear+n;for(let n=0;n<r;n++){let c=n/r,l=e.getPointAt(c);i.copy(e.getTangentAt(c)).normalize(),a.set(-i.z,0,i.x);let u=s+1,d=t.insideLoop(l.x+a.x*u,l.z+a.z*u)?1:-1,f=s,p=l.x+a.x*d*f,m=l.z+a.z*d*f;for(let e=0;e<4&&(!t.insideLoop(p,m)||!t.clearOf(p,m,.4));e++)f+=1.6,p=l.x+a.x*d*f,m=l.z+a.z*d*f;o.push({x:p,z:m})}return o}function xo(e,t,n,r){return e.map(e=>({x:t+(e.x-t)*r,z:n+(e.z-n)*r}))}function So(e,t){let n=e.length,r=0,i=0;for(let t of e)r+=t.x,i+=t.z;r/=n,i/=n;let a=0;for(let t=0;t<n;t++){let r=e[t],i=e[(t+1)%n];a+=r.x*i.z-i.x*r.z}let o=a>0?e.slice().reverse():e,s=new Float32Array((n+1)*3);s[0]=r,s[1]=t,s[2]=i;for(let e=0;e<n;e++)s[(e+1)*3]=o[e].x,s[(e+1)*3+1]=t,s[(e+1)*3+2]=o[e].z;let c=[];for(let e=0;e<n;e++){let t=e+1,r=(e+1)%n+1;c.push(0,t,r)}let l=new Pt;return l.setAttribute(`position`,new Ie(s,3)),l.setIndex(c),l.computeVertexNormals(),l}function Co(e,t,n){let r=Math.min(e.length,t.length),i=new Float32Array(r*2*3);for(let a=0;a<r;a++){let r=a*6;i[r]=e[a].x,i[r+1]=n,i[r+2]=e[a].z,i[r+3]=t[a].x,i[r+4]=n,i[r+5]=t[a].z}let a=[];for(let e=0;e<r;e++){let t=e*2,n=(e+1)%r*2;a.push(t,n,t+1,t+1,n,n+1)}let o=new Pt;return o.setAttribute(`position`,new Ie(i,3)),o.setIndex(a),o.computeVertexNormals(),o}function wo(e,t,n,r,i,a,o){let s=new J(new we(Math.max(12,r),48),a);s.rotation.x=-Math.PI/2,s.position.set(t,i,n),s.receiveShadow=!0,s.userData.surface=`grass`,s.userData.baseColor=o,e.add(s)}function To(e,t,n,r,i){let a=5818698,o=new U({color:a,roughness:1,metalness:0}),s=-.05,c=bo(t,n,3.2,96);if(c.length<8){let r=ho(t,n,i,{count:24,minSep:6,clearFoot:1.5});if(!r.length)return;let c=0,l=0;for(let e of r)c+=e.x,l+=e.z;c/=r.length,l/=r.length,wo(e,c,l,36,s,o,a);return}let l=0,u=0,d=1/0,f=-1/0,p=1/0,m=-1/0;for(let e of c)l+=e.x,u+=e.z,e.x<d&&(d=e.x),e.x>f&&(f=e.x),e.z<p&&(p=e.z),e.z>m&&(m=e.z);l/=c.length,u/=c.length;let h=(f-d)*.5,g=(m-p)*.5,_=Math.min(h,g);if(_<10){wo(e,l,u,Math.max(16,_*2),s,o,a);return}if(!n.insideLoop(l,u)||!n.clearOf(l,u,1)){let r=ho(t,n,i,{count:24,minSep:6,clearFoot:1.5});if(!r.length){wo(e,i.cx,i.cz,36,s,o,a);return}l=0,u=0;for(let e of r)l+=e.x,u+=e.z;l/=r.length,u/=r.length}let v=new U({color:12761242,roughness:.95,metalness:0}),y=new U({color:2783914,roughness:.2,metalness:.35,transparent:!0,opacity:.9}),b=new U({color:5913122,roughness:.85,metalness:.05}),S=Fa.trees.trunk,C=Fa.trees.canopy,w=new J(So(c,s),o);w.receiveShadow=!0,w.userData.surface=`grass`,w.userData.baseColor=a,e.add(w);let T=xo(c,l,u,.55),E=xo(c,l,u,.68),D=xo(c,l,u,.615),O=new J(Co(T,E,-.02),v);O.receiveShadow=!0,e.add(O);let k=Math.min(12,Math.max(5,_*.2)),A=new J(new we(k,32),y);A.rotation.x=-Math.PI/2,A.position.set(l,-.01,u),A.userData.surface=`water`,e.add(A);let j=new J(new Ft(k,k+.7,32),new U({color:9080984,roughness:.85}));j.rotation.x=-Math.PI/2,j.position.set(l,0,u),e.add(j);let ee=(e,t)=>{let n=1/0;for(let r of D){let i=(r.x-e)*(r.x-e)+(r.z-t)*(r.z-t);i<n&&(n=i)}return n<2.4*2.4},te=ho(t,n,i,{count:56,minSep:7.5,clearFoot:2.2,exclude:(e,t)=>!!((e-l)*(e-l)+(t-u)*(t-u)<(k+3.5)**2||ee(e,t))}),ne=Math.max(1,te.length),M=new L(.22,.3,1.2,5),re=new pe(1.35,6,6),N=new x(M,S,ne);N.count=0,N.castShadow=!1,N.userData.sharedVegMat=!0;let ie=C.map(e=>{let t=new x(re,e,ne);return t.count=0,t.castShadow=!1,t.userData.sharedVegMat=!0,t});for(let{x:e,z:t,i:n}of te){let i=.75+Q(n,7)*.55;r.position.set(e,.6*i,t),r.scale.set(i,i,i),r.rotation.set(0,Q(n,11)*6,0),r.updateMatrix(),N.setMatrixAt(N.count++,r.matrix);let a=ie[Math.floor(Q(n,13)*ie.length)%ie.length];r.position.set(e,2*i,t),r.scale.set(i*1.15,i*1.05,i*1.15),r.updateMatrix(),a.setMatrixAt(a.count++,r.matrix)}N.count&&(N.instanceMatrix.needsUpdate=!0,N.computeBoundingSphere(),e.add(N));for(let t of ie)t.count&&(t.instanceMatrix.needsUpdate=!0,t.computeBoundingSphere(),e.add(t));let P=Math.min(20,D.length),F=new x(new Y(1,1,1),b,P);F.count=0;let ae=Math.max(1,Math.floor(D.length/P));for(let e=0;e<D.length&&F.count<P;e+=ae){let t=D[e],i=D[(e+1)%D.length],a=i.x-t.x,o=i.z-t.z,s=Math.hypot(a,o)||1,c=t.x-l,d=t.z-u,f=Math.hypot(c,d)||1,p=t.x+c/f*2.6,m=t.z+d/f*2.6;!n.insideLoop(p,m)||!n.clearOf(p,m,1.5)||(r.position.set(p,.35,m),r.scale.set(1.8,.55,.55),r.rotation.set(0,Math.atan2(a/s,o/s),0),r.updateMatrix(),F.setMatrixAt(F.count++,r.matrix))}F.count&&(F.instanceMatrix.needsUpdate=!0,F.computeBoundingSphere(),e.add(F))}function Eo(e,t,n,r,i=1,a=Fa.trees){let o=Math.max(.25,Math.min(1,i)),s=ho(t,n,r,{count:Math.round(260*o),minSep:4.2/Math.sqrt(o),clearFoot:2.5});if(!s.length)return;let c=new L(.22,.3,1.2,5),l=new pe(1.35,6,6),u=new Ce,d=s.length,f=new x(c,a.trunk,d);f.count=0,f.castShadow=!1,f.userData.sharedVegMat=!0;let p=a.canopy.map(e=>{let t=new x(l,e,d);return t.count=0,t.castShadow=!1,t.userData.sharedVegMat=!0,t});for(let{x:e,z:t,i:n}of s){let r=.85+Q(n,7)*.75;u.position.set(e,.6*r,t),u.scale.set(r,r,r),u.rotation.set(0,Q(n,11)*6,0),u.updateMatrix(),f.setMatrixAt(f.count++,u.matrix);let i=p[Math.floor(Q(n,13)*p.length)%p.length],a=r*(1.15+Q(n,17)*.3);u.position.set(e,2.05*r,t),u.scale.set(a,a*1.05,a),u.updateMatrix(),i.setMatrixAt(i.count++,u.matrix)}f.count&&(f.instanceMatrix.needsUpdate=!0,f.computeBoundingSphere(),e.add(f));for(let t of p)t.count&&(t.instanceMatrix.needsUpdate=!0,t.computeBoundingSphere(),e.add(t))}function Do(e,t,n){let r=Math.cos(e.yaw),i=Math.sin(e.yaw);return{x:e.cx+t*r-n*i,z:e.cz+t*i+n*r}}function Oo(e,t,n,r=0){let i=Math.cos(n.yaw),a=Math.sin(n.yaw),o=e-n.cx,s=t-n.cz,c=o*i+s*a,l=-o*a+s*i;return Math.abs(c)<=n.halfW+r&&Math.abs(l)<=n.halfD+r}function ko(e,t,n,r=0){for(let i of n)if(Oo(e,t,i,r))return!0;return!1}function Ao(e,t,n){let r=Math.cos(e.yaw),i=Math.sin(e.yaw),a=t.cx-e.cx,o=t.cz-e.cz,s=a*r+o*i,c=-a*i+o*r;return Math.abs(s)<e.halfW+t.halfW+n&&Math.abs(c)<e.halfD+t.halfD+n}function jo(e,t,n){let r=1/0;for(let i=0;i<=80;i++){let a=e.getPointAt(i/80),o=(a.x-t)*(a.x-t)+(a.z-n)*(a.z-n);o<r&&(r=o)}return r}function Mo(e,t,n,r=4){let i=.28,a=[],o=(t,n)=>{let r=Math.sqrt(jo(e,t,n));return r+(r<16?8+(16-r):r>48?(r-48)*1.4:0)},s=null,c=bo(e,t,3.5,96);if(c.length>=8){let e=0,t=0;for(let n of c)e+=n.x,t+=n.z;s={x:e/c.length,z:t/c.length},a.push({...s,score:o(s.x,s.z)});for(let e=0;e<c.length;e+=3){let t=c[e];a.push({x:t.x,z:t.z,score:o(t.x,t.z)})}}let l=ho(e,t,n,{count:96,minSep:6,clearFoot:1.6});if(l.length){let e=0,t=0;for(let n of l)e+=n.x,t+=n.z;let n={x:e/l.length,z:t/l.length};if((!s||(n.x-s.x)**2+(n.z-s.z)**2>4)&&a.push({...n,score:o(n.x,n.z)}),s){let e=0;for(let t of l){let n=Math.hypot(t.x-s.x,t.z-s.z);n>e&&(e=n)}let t=Math.max(18,e*.38);for(let[e,n]of[[1,0],[-.35,1],[-.35,-1],[.2,.85],[.2,-.85],[-1,.15],[.7,.7],[-.7,.7]]){let r=Math.hypot(e,n)||1,i=s.x+e/r*t,c=s.z+n/r*t;a.push({x:i,z:c,score:o(i,c)})}}for(let e of l)a.push({x:e.x,z:e.z,score:o(e.x,e.z)})}a.sort((e,t)=>e.score-t.score);let u=[[0,0],[1,1],[1,-1],[-1,1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]],d=(e,n,r,a,o,s)=>{let c={cx:e,cz:n,halfW:r,halfD:a,yaw:i};if(!t.insideLoop(e,n)||!t.clearOf(e,n,Math.max(.4,o*.5)))return!1;let l=s?[[1,1],[1,-1],[-1,1],[-1,-1]]:u;for(let[e,n]of l){let{x:i,z:s}=Do(c,e*r*.92,n*a*.92);if(!t.insideLoop(i,s)||!t.clearOf(i,s,o))return!1}return!0},f=[],p=new Set,m=(e,t,n,o)=>{for(let s of a){if(f.length>=r)break;let a=`${s.x.toFixed(1)},${s.z.toFixed(1)}`;if(!(p.has(a)&&t>.5)){p.add(a);for(let r of e){let e=14*r,a=11*r;if(!d(s.x,s.z,e,a,t,o))continue;let c={cx:s.x,cz:s.z,halfW:e,halfD:a,yaw:i},l=!1;for(let e of f)if(Ao(c,e,n)){l=!0;break}if(!l){f.push(c);break}}}}};if(m([1,.9,.78,.65],1.2,5,!1),f.length<r&&(p.clear(),m([.85,.7,.55,.42],.55,3.5,!1)),f.length<r&&(p.clear(),m([.7,.55,.42,.32],.2,2.5,!0)),f.length<r)for(let e of a){if(f.length>=r)break;if(!t.insideLoop(e.x,e.z)||!t.clearOf(e.x,e.z,.8))continue;let n={cx:e.x,cz:e.z,halfW:7,halfD:5.5,yaw:i},a=!1;for(let e of f)if(Ao(n,e,2)){a=!0;break}a||f.push(n)}return f}function No(e,t,n,r=0){let i=12085302,a=new U({color:i,roughness:.95,metalness:0,flatShading:!0}),o=new U({color:7223828,roughness:1,metalness:0,flatShading:!0}),s=new U({color:3119656,roughness:.92,metalness:0,flatShading:!0}),c=new U({color:7262010,roughness:.9,metalness:0,flatShading:!0}),l=new U({color:14826018,roughness:.65,metalness:.15,flatShading:!0}),u=new U({color:2765628,roughness:.55,metalness:.25,flatShading:!0}),d=new U({color:1710622,roughness:.95,metalness:.05,flatShading:!0}),f=new U({color:4870232,roughness:.6,metalness:.35,flatShading:!0}),p=new V;p.name=`farm-${r}`,p.position.set(t.cx,0,t.cz),p.rotation.y=t.yaw;let m=new J(new Y(t.halfW*2,.32,t.halfD*2),a);m.name=`farm-${r}-soil`,m.position.y=.06,m.receiveShadow=!0,m.userData.surface=`dirt`,m.userData.baseColor=i,p.add(m);let h=new Y(t.halfW*1.88,.12,.7);for(let e=0;e<5;e++){let n=(e+.5)/5,r=-t.halfD*.8+n*t.halfD*1.6,i=new J(h,o);i.position.set(0,.24,r),i.receiveShadow=!0,p.add(i)}let g=new L(.07,.1,.55,4),_=new pe(.38,5,4),v=new x(g,s,55),y=new x(_,c,55);v.count=0,y.count=0,v.castShadow=!1,y.castShadow=!1;let b=new Ce,S=0;for(let e=0;e<5;e++){let n=(e+.5)/5,r=-t.halfD*.8+n*t.halfD*1.6;for(let n=0;n<11;n++){let i=(n+.5)/11,a=-t.halfW*.84+i*t.halfW*1.68,o=1.05+Q(S+3,e*17+n)*.55;b.position.set(a,.28+.28*o,r),b.scale.set(o,o,o),b.rotation.set(0,Q(n,e+9)*6,0),b.updateMatrix(),v.setMatrixAt(v.count++,b.matrix),b.position.set(a,.55+.42*o,r),b.scale.set(o*.95,o*.85,o*.95),b.updateMatrix(),y.setMatrixAt(y.count++,b.matrix),S+=1}}v.instanceMatrix.needsUpdate=!0,y.instanceMatrix.needsUpdate=!0,v.computeBoundingSphere(),y.computeBoundingSphere(),p.add(v),p.add(y);let C=new V;C.name=`farm-${r}-tractor`;let w=t.halfD+4.2,T=t.halfW*.12,E=Do(t,T,w);if(n.insideLoop(E.x,E.z)&&n.clearOf(E.x,E.z,2))C.position.set(T,0,w);else{let e=Do(t,T,-w);n.insideLoop(e.x,e.z)&&n.clearOf(e.x,e.z,2)?(C.position.set(T,0,-w),C.rotation.y=Math.PI):(C.position.set(t.halfW*.55,0,t.halfD*.55),C.rotation.y=Math.PI/2)}let D=new J(new Y(2.2,.9,1.35),l);D.position.set(.15,1.05,0),D.castShadow=!1,C.add(D);let O=new J(new Y(1.2,.55,1.15),l);O.position.set(1.05,.9,0),C.add(O);let k=new J(new Y(.95,.9,1.05),u);k.position.set(-.4,1.65,0),C.add(k);let A=new J(new L(.1,.12,.9,5),f);A.position.set(.7,1.7,.35),C.add(A);let j=new L(.7,.7,.42,8),ee=new L(.4,.4,.34,8);for(let[e,t,n,r]of[[-.55,.7,.78,j],[-.55,.7,-.78,j],[1.05,.4,.58,ee],[1.05,.4,-.58,ee]]){let i=new J(r,d);i.rotation.x=Math.PI/2,i.position.set(e,t,n),C.add(i)}p.add(C),e.add(p)}function Po(e,t,n,r){let i=Mo(t,n,r,4),a=ho(t,n,r,{count:220,minSep:5.5,clearFoot:2.4,exclude:i.length?(e,t)=>ko(e,t,i,7.5):void 0});if(a.length){let t=Fa.sparse,n=new L(.22,.3,1.2,5),r=new pe(1.5,6,6),i=t.canopy[0],o=new Ce,s=a.length,c=new x(n,t.trunk,s);c.count=0,c.castShadow=!1,c.userData.sharedVegMat=!0;let l=new x(r,i,s);l.count=0,l.castShadow=!1,l.userData.sharedVegMat=!0;for(let{x:e,z:t,i:n}of a){let r=.95+Q(n,7)*.85;o.position.set(e,.6*r,t),o.scale.set(r,r,r),o.rotation.set(0,Q(n,11)*6,0),o.updateMatrix(),c.setMatrixAt(c.count++,o.matrix);let i=r*(1.2+Q(n,17)*.35);o.position.set(e,2.1*r,t),o.scale.set(i,i*1.05,i),o.updateMatrix(),l.setMatrixAt(l.count++,o.matrix)}c.count&&(c.instanceMatrix.needsUpdate=!0,c.computeBoundingSphere(),e.add(c)),l.count&&(l.instanceMatrix.needsUpdate=!0,l.computeBoundingSphere(),e.add(l))}for(let t=0;t<i.length;t++)No(e,i[t],n,t);typeof console<`u`&&console.info&&console.info(`[meadow] planted ${i.length} farm plot(s)`)}function Fo(e,t,n,r,i,a=1){if(i.props===`city`||i.props===`mountains`||i.props===`yard`||i.vegetation===`none`)return;if(i.id===`forest`){Eo(e,t,n,r,a,Fa.trees);return}if(i.id===`meadow`||i.vegetation===`sparse`){if(a<.55)return;Po(e,t,n,r);return}let o=i.vegetation===`palms`,s=Math.max(.25,Math.min(1,a)),c=ho(t,n,r,{count:Math.round((o?56:44)*s),minSep:(o?7.8:7.5)/Math.sqrt(s),clearFoot:o?2.8:2.3});if(!c.length)return;if(o){Ga(e,c.map(({x:e,z:t,i:n})=>({x:e,z:t,scale:.9+Q(n,7)*.75,jitter:Q(n,11)})),Fa.palms);return}let l=i.vegetation===`pines`,u=i.vegetation===`cactus`,d=Ka(i),f=u?new L(.18,.22,2.4,5):new L(.22,.3,l?2.2:1.2,5),p=l?new nt(1.1,2.6,6):u?new pe(.35,5,4):new pe(1.35,6,6),m=c.length,h=new x(f,d.trunk,m);h.count=0,h.castShadow=!1,h.userData.sharedVegMat=!0;let g=d.canopy.map(e=>{let t=new x(p,e,m);return t.count=0,t.castShadow=!1,t.userData.sharedVegMat=!0,t}),_=new Ce;for(let{x:e,z:t,i:n}of c){let r=.7+Q(n,7)*.6,i=u||l?1.1:.6;_.position.set(e,i*r,t),_.scale.set(r,r,r),_.rotation.set(0,Q(n,11)*6,0),_.updateMatrix(),h.setMatrixAt(h.count++,_.matrix);let a=g[Math.floor(Q(n,13)*g.length)%g.length],o=l?2.2*r:u?2.5*r:2*r,s=u?.9+Q(n,17)*.3:r*(1.05+Q(n,17)*.25);_.position.set(e,o,t),_.scale.set(s,l?s*1.2:s,s),_.updateMatrix(),a.setMatrixAt(a.count++,_.matrix)}h.instanceMatrix.needsUpdate=!0,h.computeBoundingSphere(),e.add(h);for(let t of g)t.count&&(t.instanceMatrix.needsUpdate=!0,t.computeBoundingSphere(),e.add(t))}function Io(e,t,n,r,i=1,a,o,s){let c=Math.max(.15,Math.min(1,i)),l=Ha(t,n);if(r.props===`yard`){fo(e,t,n,l,Ro(t),c,a,o,s);return}let{poses:u,bounds:d}=Ua(t,n,r.props===`city`?0:Math.max(.2,r.density*.7*c),l);uo(e,t,r,l,u,d),qa(e,t,n,c<1?{...r,density:r.density*c}:r,l),Fo(e,t,l,d,r,c)}function Lo(e){return e.points.map(([e,t])=>new I(e,0,t))}function Ro(e){let t=1/0,n=-1/0,r=1/0,i=-1/0;for(let a=0;a<120;a++){let o=e.getPointAt(a/120);o.x<t&&(t=o.x),o.x>n&&(n=o.x),o.z<r&&(r=o.z),o.z>i&&(i=o.z)}return{minX:t-48,maxX:n+48,minZ:r-48,maxZ:i+48,cx:(t+n)*.5,cz:(r+i)*.5,spanX:n-t+96,spanZ:i-r+96}}var zo=4,Bo=7,Vo=22,Ho=.4;function Uo(e){return(e%1+1)%1}function Wo(e,t){let n=Math.abs(Uo(e)-Uo(t));return n>.5&&(n=1-n),n}function Go(e,t,n,r,i,a,o,s){let c=n-e,l=r-t,u=o-i,d=s-a,f=c*d-l*u;if(Math.abs(f)<1e-9)return null;let p=((i-e)*d-(a-t)*u)/f,m=((i-e)*l-(a-t)*c)/f;return p<=.002||p>=.998||m<=.002||m>=.998?null:{x:e+p*c,z:t+p*l,t:p,u:m}}function Ko(e){let t=[];for(let n=0;n<640;n++){let r=n/640,i=e.getPointAt(r);t.push({t:r,x:i.x,z:i.z})}let n=[];for(let e=0;e<640;e++){let r=t[e],i=t[(e+1)%640];for(let a=e+76;a<564;a++){if(Math.min(Math.abs(e-a),640-Math.abs(e-a))<76)continue;let o=t[a],s=t[(a+1)%640],c=Go(r.x,r.z,i.x,i.z,o.x,o.z,s.x,s.z);c&&n.push({tA:r.t,tB:o.t,x:c.x,z:c.z})}}let r=[];for(let e of n)r.find(t=>Math.hypot(t.x-e.x,t.z-e.z)<14)||r.push(e);return r.sort((e,t)=>Math.min(e.tA,e.tB)-Math.min(t.tA,t.tB)),r}function qo(e,t,n,r){let i=Math.min(n.tA,n.tB),a=Math.max(n.tA,n.tB),o=e.getLength(),s=e.getTangentAt(i).normalize(),c=e.getTangentAt(a).normalize(),l=Math.abs(s.x*c.z-s.z*c.x),u=t+3.6,d=t*2+2.2,f=(t*2+6)/Math.max(.75,l),p=f*.5+.8,m=[],h=[],g=30.5/o,_=new I,v=new I;for(let t=0;t<=48;t++){let n=Uo(i-g+t/48*g*2);if(r(n)>-.04)continue;e.getPointAt(n,_),e.getTangentAt(n,v).normalize();let a=-v.z,o=v.x;m.push({x:_.x+a*u,z:_.z+o*u}),h.push({x:_.x-a*u,z:_.z-o*u})}let y=[];for(let e=0;e<m.length;e++)y.push(m[e]);for(let e=h.length-1;e>=0;e--)y.push(h[e]);return{underT:i,bridgeT:a,crossX:n.x,crossZ:n.z,underHeading:Math.atan2(s.x,s.z),bridgeHeading:Math.atan2(c.x,c.z),bridgeGapHalf:p,deckAlong:f,deckAcross:d,cutHalf:u,trenchAlong:29,holePoly:y}}function Jo(e,t){let n=Ko(e);if(!n.length)return null;let r=e.getLength(),i=zo,a=Bo,o=Vo,s=Ho,c=n.map(e=>({underT:Math.min(e.tA,e.tB),bridgeT:Math.max(e.tA,e.tB)})),l=e=>{let t=0;for(let n of c){let i=Wo(e,n.bridgeT)*r;if(i<13){let e=0;if(i<=a*.65)e=s;else{let t=(i-a*.65)/(13-a*.65),n=t*t*(3-2*t);e=s*(1-n)}e>t&&(t=e)}let c=Wo(e,n.underT)*r,l=0;if(c<=a)l=-4;else if(c<29){let e=(c-a)/o;l=-4*(1-e*e*(3-2*e))}l<t&&(t=l)}return t},u=e=>{let t=.0025;return(l(Uo(e+t))-l(e))/(r*t)},d=n.map(n=>qo(e,t,n,l));return{heightAt:l,gradeAt:u,inCut:(e,t)=>{for(let n of d){let r=Math.sin(n.underHeading),i=Math.cos(n.underHeading),a=-Math.cos(n.underHeading),o=Math.sin(n.underHeading),s=e-n.crossX,c=t-n.crossZ,l=s*r+c*i,u=s*a+c*o;if(Math.abs(l)<n.trenchAlong+3&&Math.abs(u)<n.cutHalf+2.5)return!0;let d=n.holePoly;if(d.length>=6){let n=!1;for(let r=0,i=d.length-1;r<d.length;i=r++){let a=d[r],o=d[i];a.z>t!=o.z>t&&e<(o.x-a.x)*(t-a.z)/(o.z-a.z+1e-12)+a.x&&(n=!n)}if(n)return!0}}return!1},nearBridge:e=>d.some(t=>Wo(e,t.bridgeT)*r<t.bridgeGapHalf+3),sites:d,depth:i,bridgeDeckY:s}}function Yo(e,t,n,r){let i=e.minX-r,a=e.maxX+r,o=e.minZ-r,s=e.maxZ+r,c=n?.sites.map(e=>e.holePoly).filter(e=>e.length>=6)??[];if(!c.length){let n=new J(new j(e.spanX+r*2,e.spanZ+r*2),new U({color:t,roughness:1}));return n.rotation.x=-Math.PI/2,n.position.set(e.cx,-.12,e.cz),n}let l=new w;l.moveTo(i,-o),l.lineTo(i,-s),l.lineTo(a,-s),l.lineTo(a,-o),l.closePath();for(let e of c){let t=new Nt,n=e[e.length-1];t.moveTo(n.x,-n.z);for(let n=e.length-2;n>=0;n--){let r=e[n];t.lineTo(r.x,-r.z)}t.closePath(),l.holes.push(t)}let u=new et(l,2);u.rotateX(-Math.PI/2),u.computeVertexNormals();let d=new J(u,new U({color:t,roughness:1,side:2}));return d.position.y=-.12,d}function Xo(e,t,n,r,i,a,o){let s=new U({color:9069112,roughness:.95,metalness:.02,flatShading:!0}),c=new U({color:5914664,roughness:1,metalness:.02}),l=new U({color:12104614,roughness:.78,metalness:.08}),u=new U({color:7235676,roughness:.9,metalness:.05}),d=new U({color:6966834,roughness:.62,metalness:.28}),f=new U({color:a,roughness:.92,metalness:.04}),p=new U({color:o,roughness:.65,metalness:.04}),m=Math.sin(i.underHeading),h=Math.cos(i.underHeading),g=-Math.cos(i.underHeading),_=Math.sin(i.underHeading),v=-Math.cos(i.bridgeHeading),y=Math.sin(i.bridgeHeading),b=Math.sin(i.bridgeHeading),x=Math.cos(i.bridgeHeading),S=(t,n,r,a)=>{t.position.set(i.crossX+v*n+b*a,r,i.crossZ+y*n+x*a),t.rotation.y=i.bridgeHeading,e.add(t)},C=t.getLength(),w=(i.trenchAlong+.8)/C,T=n+.9,E=i.cutHalf,D=new I,O=new I,k=[];for(let e=0;e<=56;e++){let n=Uo(i.underT-w+e/56*w*2),a=r.heightAt(n);if(a>-.03)continue;t.getPointAt(n,D),t.getTangentAt(n,O).normalize();let o=-O.z,s=O.x,c=.02;k.push({ixL:D.x+o*T,iyL:a-.05,izL:D.z+s*T,oxL:D.x+o*E,oyL:c,ozL:D.z+s*E,ixR:D.x-o*T,iyR:a-.05,izR:D.z-s*T,oxR:D.x-o*E,oyR:c,ozR:D.z-s*E,fxL:D.x+o*(T-.15),fy:a-.18,fzL:D.z+s*(T-.15),fxR:D.x-o*(T-.15),fzR:D.z-s*(T-.15)})}if(k.length>=2){let t=[],n=[],r=[],i=[],a=(e,r,i,a,o,s,c,l,u,d,f,p)=>{let m=t.length/3;t.push(e,r,i,a,o,s,c,l,u,d,f,p),n.push(m,m+1,m+2,m,m+2,m+3)};for(let e=0;e<k.length-1;e++){let t=k[e],n=k[e+1];a(t.ixL,t.iyL,t.izL,t.oxL,t.oyL,t.ozL,n.oxL,n.oyL,n.ozL,n.ixL,n.iyL,n.izL),a(t.oxR,t.oyR,t.ozR,t.ixR,t.iyR,t.izR,n.ixR,n.iyR,n.izR,n.oxR,n.oyR,n.ozR),a(t.oxL,t.oyL,t.ozL,t.oxL+(t.oxL-t.ixL)*.15,t.oyL+.01,t.ozL+(t.ozL-t.izL)*.15,n.oxL+(n.oxL-n.ixL)*.15,n.oyL+.01,n.ozL+(n.ozL-n.izL)*.15,n.oxL,n.oyL,n.ozL),a(t.oxR,t.oyR,t.ozR,n.oxR,n.oyR,n.ozR,n.oxR+(n.oxR-n.ixR)*.15,n.oyR+.01,n.ozR+(n.ozR-n.izR)*.15,t.oxR+(t.oxR-t.ixR)*.15,t.oyR+.01,t.ozR+(t.ozR-t.izR)*.15);let o=r.length/3;r.push(t.fxL,t.fy,t.fzL,t.fxR,t.fy,t.fzR,n.fxR,n.fy,n.fzR,n.fxL,n.fy,n.fzL),i.push(o,o+1,o+2,o,o+2,o+3)}let o=new Pt;o.setAttribute(`position`,new N(t,3)),o.setIndex(n),o.computeVertexNormals();let l=new J(o,s);l.receiveShadow=!0,l.castShadow=!0,e.add(l);let u=new Pt;u.setAttribute(`position`,new N(r,3)),u.setIndex(i),u.computeVertexNormals();let d=new J(u,c);d.receiveShadow=!0,e.add(d)}let A=.5,j=r.bridgeDeckY,ee=j-A,te=new J(new Y(i.deckAcross,A,i.deckAlong),l);S(te,0,(j+ee)*.5,0),te.castShadow=!0,te.receiveShadow=!0;let ne=new J(new Y(i.deckAcross-.15,.08,i.deckAlong-.2),u);S(ne,0,ee-.04,0),ne.castShadow=!1;let M=new J(new Y(n*2,.1,i.deckAlong+.4),f);S(M,0,j+.06,0),M.receiveShadow=!0,M.layers.enable(Aa);for(let e of[-1,1]){let t=new J(new Y(n*2+.3,.1,3.2),f);S(t,0,j*.5+.03,e*(i.deckAlong*.5+1.4)),t.receiveShadow=!0,t.layers.enable(Aa)}for(let e of[-1,1]){S(new J(new Y(.22,.04,i.deckAlong+.3),p),e*(n-.12),j+.12,0);let t=new J(new Y(.36,.75,i.deckAlong+.4),d);S(t,e*(i.deckAcross*.5-.12),ee-.15,0),t.castShadow=!0,S(new J(new Y(.14,.55,i.deckAlong+.15),d),e*(n+.35),j+.38,0)}for(let e=0;e<3;e++){let t=(e+.5)/3-.5,r=new J(new Y(.34,.42,i.deckAlong-.6),d);S(r,t*(n*2-1.5),ee-.28,0),r.castShadow=!0}for(let e=0;e<4;e++){let t=(e+.5)/4-.5;S(new J(new Y(i.deckAcross-.5,.2,.28),d),0,ee-.18,t*(i.deckAlong-1.2))}let re=r.depth+ee+.15,ie=-r.depth+re*.5,P=Math.max(1.1,i.deckAcross*.18),F=n+1.9;for(let t of[-1,1])for(let n of[-1,1]){let r=new J(new Y(1.1,re,1.2),l);r.position.set(i.crossX+g*n*F+m*t*P,ie,i.crossZ+_*n*F+h*t*P),r.rotation.y=i.underHeading,r.castShadow=!0,r.receiveShadow=!0,e.add(r)}}function Zo(e,t,n,r,i=0,a,o){let s=[],c=[],l=[],u=new I,d=new I,f=new I,p=new I,m=new I,h=a?e.getLength():0,g=1/Math.max(1,r);for(let o=0;o<=r;o++){let l=o/r%1;e.getPointAt(l,u),e.getTangentAt(l,d).normalize(),f.set(-d.z,0,d.x);let _=Math.hypot(f.x,f.z)||1;f.x/=_,f.z/=_;let v=(a?a(l):0)+n,y=u.x+f.x*i,b=u.z+f.z*i;if(s.push(y-f.x*t,v,b-f.z*t,y+f.x*t,v,b+f.z*t),a){let e=a(Uo(l+g))-a(l);m.set(d.x,e/(h*g+1e-6),d.z).normalize(),p.copy(f).cross(m),p.y<0&&p.negate();let t=p.length()||1;p.multiplyScalar(1/t),c.push(p.x,p.y,p.z,p.x,p.y,p.z)}else c.push(0,1,0,0,1,0)}for(let e=0;e<r;e++){let t=e/r,n=(e+1)/r;if(o&&(o(t)||o(n%1)))continue;let i=e*2;l.push(i,i+1,i+2,i+1,i+3,i+2)}let _=new Pt;return _.setAttribute(`position`,new N(s,3)),_.setAttribute(`normal`,new N(c,3)),_.setIndex(l),_}function Qo(e=wa,t){let n=Oa(e),r=ga(n.biome??n.id),i=t?.sceneryScale??1,a=Math.max(.5,t?.widthScale??1),o=new V,s=pa(r);s&&(o.userData.biomeAtmosphere=s);let c=(Sa(n.id)?16:14)*a,l=c/2,u=new Mt(Lo(n),!0,`catmullrom`,.5),d=Ro(u),f=Ca(n)?Jo(u,l):null,p=f?f.heightAt:void 0,m=r.props===`mountains`?Math.min(290,Math.max(d.spanX,d.spanZ)*.55+180)+60:0,h=Yo(d,r.ground,f,m);h.userData.surface=`grass`,h.userData.baseColor=r.ground,h.receiveShadow=!0,o.add(h);let g=u.getLength(),_=Math.max(480,Math.min(1400,Math.ceil(g/(f?.95:1.35)))),v=f?e=>f.sites.some(t=>Wo(e,t.bridgeT)*g<t.bridgeGapHalf):void 0,y=new J(Zo(u,l+Ba,-.02,_,0,p,v),new U({color:r.runoff,roughness:1,metalness:0}));y.userData.surface=`runoff`,y.userData.baseColor=r.runoff,y.receiveShadow=!0,y.layers.enable(Aa),o.add(y);let b=new J(Zo(u,l,.035,_,0,p,v),new U({color:r.asphalt,roughness:.92,metalness:.04}));b.userData.surface=`asphalt`,b.userData.baseColor=r.asphalt,b.receiveShadow=!0,b.layers.enable(Aa),o.add(b);let x=.11,S=new U({color:r.edge,roughness:.65,metalness:.04}),C=Math.max(_,Math.ceil(g/1.1));for(let e of[-1,1]){let t=new J(Zo(u,x,.048,C,e*(l-x),p,v),S);t.castShadow=!1,t.receiveShadow=!1,t.layers.enable(Aa),o.add(t)}if(f)for(let e of f.sites)Xo(o,u,l,f,e,r.asphalt,r.edge);let w=u.getPointAt(0),T=u.getTangentAt(0).normalize(),E=new I(-T.z,0,T.x),D=ja(T);for(let e=0;e<10;e++)for(let t=0;t<2;t++){let n=(e+t)%2==0?1118481:16777215,r=new J(new Y(c/10,.05,.7),new U({color:n,roughness:.7}));r.position.copy(w).addScaledVector(E,-l+(e+.5)*(c/10)).addScaledVector(T,(t-.5)*.7),r.position.y=.07,r.rotation.y=D,o.add(r)}let O=new V;O.position.copy(w),O.rotation.y=D;for(let e of[-l-1.2,l+1.2]){let t=new J(new Y(.35,5.5,.35),new U({color:9080986,metalness:.5,roughness:.4}));t.position.set(e,2.75,0),O.add(t)}let k=new J(new Y(c+4,.45,1.2),new U({color:r.id===`yard`?15777824:16726830,metalness:.25,roughness:.5}));k.position.set(0,5.4,0),O.add(k),o.add(O),Io(o,u,l,r,i,f?.inCut,f?.heightAt,f?e=>f.nearBridge(e):void 0),o.updateMatrixWorld(!0),o.traverse(e=>{e.matrixAutoUpdate=!1});let A=ja(T);return{id:n.id,name:n.name,group:o,path:u,startPosition:w.clone().addScaledVector(E,-2.8),startHeading:A,width:c,worldBounds:{minX:d.minX-m,maxX:d.maxX+m,minZ:d.minZ-m,maxZ:d.maxZ+m},heightAt:f?.heightAt,gradeAt:f?.gradeAt}}function $o(e){e.group.removeFromParent();let t=new Set,n=new Set;e.group.traverse(e=>{if(e instanceof pt){e.dispose();return}let r=e;if(!r.isMesh&&!r.isInstancedMesh)return;r.geometry&&t.add(r.geometry);let i=Array.isArray(r.material)?r.material:[r.material];for(let e of i)e&&(Ia.has(e)||n.add(e))});for(let e of t)e.dispose();for(let e of n)e.dispose()}var es=new I,ts=new I,ns=new I,rs={t:0,distanceFromCenter:0,tangent:ts},is=[.2,.4,.6,.8],as=class{nextIndex=0;reset(){this.nextIndex=0}get readyForFinish(){return this.nextIndex>=is.length}update(e,t){if(!(e>.7&&t<.3||e<.3&&t>.7)&&!(t+.001<e))for(;this.nextIndex<is.length;){let n=is[this.nextIndex];if(e<n&&t>=n){this.nextIndex+=1;continue}break}}};function os(e,t,n,r,i){for(let a=-6;a<=6;a++){let o=(n+a*i*.2+1)%1;e.getPointAt(o,es);let s=es.x-t.x,c=es.z-t.z,l=s*s+c*c;l<r&&(r=l,n=o,ns.copy(es))}e.getTangentAt(n,ts).normalize();let a=-ts.z,o=ts.x;return rs.t=n,rs.distanceFromCenter=(t.x-ns.x)*a+(t.z-ns.z)*o,rs}function ss(e,t,n=220){let r=0,i=1/0;for(let a=0;a<n;a++){let o=a/n;e.getPointAt(o,es);let s=es.x-t.x,c=es.z-t.z,l=s*s+c*c;l<i&&(i=l,r=o,ns.copy(es))}return os(e,t,r,i,1/n)}function cs(e,t,n,r=.05,i=48){let a=n,o=1/0,s=2*r/i;for(let c=0;c<=i;c++){let i=(n-r+c*s+1)%1;e.getPointAt(i,es);let l=es.x-t.x,u=es.z-t.z,d=l*l+u*u;d<o&&(o=d,a=i,ns.copy(es))}return os(e,t,a,o,s)}var ls=new I,us=new I,ds=class e{offset;count;length;ts;cum;points;tangents;normals;constructor(e,t,n,r,i,a,o){this.offset=e,this.length=t,this.ts=n,this.cum=r,this.points=i,this.tangents=a,this.normals=o,this.count=i.length}static trace(t,n,r=640){let i=Math.max(64,r),a=new Float64Array(i),o=new Float64Array(i),s=[],c=[],l=[],u=null;for(let e=0;e<i;e++){let r=e/i;t.getPointAt(r,ls),t.getTangentAt(r,us).normalize();let o=new I(-us.z,0,us.x);u&&o.dot(u)<0&&o.negate();let d=Math.hypot(o.x,o.z)||1;o.x/=d,o.z/=d,u=o,a[e]=r,s.push(ls.clone().addScaledVector(o,n)),c.push(us.clone()),l.push(o)}o[0]=0;for(let e=1;e<i;e++)o[e]=o[e-1]+s[e].distanceTo(s[e-1]);let d=o[i-1]+s[0].distanceTo(s[i-1]);for(let e=0;e<i;e++){let t=s[(e-1+i)%i],n=s[(e+1)%i],r=n.x-t.x,a=n.z-t.z,o=Math.hypot(r,a)||1;c[e].set(r/o,0,a/o)}return new e(n,d,a,o,s,c,l)}indexAtT(e){let t=(e%1+1)%1,n=0,r=1/0,i=Math.round(t*this.count)%this.count;for(let e=-2;e<=2;e++){let a=(i+e+this.count)%this.count,o=Math.min(Math.abs(this.ts[a]-t),1-Math.abs(this.ts[a]-t));o<r&&(r=o,n=a)}return n}pointAtT(e,t=new I){let n=this.indexAtT(e);return t.copy(this.points[n])}tangentAtT(e,t=new I){let n=this.indexAtT(e);return t.copy(this.tangents[n])}sampleAhead(e,t,n=new I,r=new I){let i=this.indexAtT(e),a=this.count,o=0,s=t;for(;s>0&&o++<a+2;){let e=(i+1)%a,t=e===0?this.length-this.cum[i]:this.cum[e]-this.cum[i];if(t<=1e-6){i=e;continue}if(s<=t){let a=s/t;n.lerpVectors(this.points[i],this.points[e],a),r.copy(this.tangents[e]).multiplyScalar(a).addScaledVector(this.tangents[i],1-a);let o=Math.hypot(r.x,r.z)||1;r.set(r.x/o,0,r.z/o);return}s-=t,i=e}n.copy(this.points[i]),r.copy(this.tangents[i])}curvatureAhead(e,t){let n=this.indexAtT(e),r=this.count,i=0,a=0,o=0,s=0,c=this.tangents[n];for(let e=1;e<=r;e++){let l=(n+e)%r,u=(n+e-1)%r,d=l===0?this.length-this.cum[u]:this.cum[l]-this.cum[u];if(d<1e-6)continue;if(s+=d,s>t)break;let f=this.tangents[l],p=c.x*f.x+c.z*f.z;p=Math.max(-1,Math.min(1,p));let m=Math.acos(p);o+=m;let h=m/Math.max(d,.5);i=Math.max(i,h),s<=t*.4&&(a=Math.max(a,h)),c=f}let l=o/Math.max(t,1);return i=Math.max(i,l),fs.maxKappa=i,fs.nearKappa=Math.max(a,l*.85),fs.turnAngle=o,fs}},fs={maxKappa:0,nearKappa:0,turnAngle:0};function ps(e,t=160){let n=new Mt(e.points.map(([e,t])=>new I(e,0,t)),!0,`catmullrom`,.5),r=[];for(let e=0;e<=t;e++){let i=n.getPointAt(e/t);r.push({x:i.x,z:i.z})}return r}function ms(e,t,n={}){let r=Oa(t),i=n.dpr??Math.min(devicePixelRatio||1,2),a=e.clientWidth||96,o=e.clientHeight||96,s=Math.round(a*i),c=Math.round(o*i);(e.width!==s||e.height!==c)&&(e.width=s,e.height=c);let l=e.getContext(`2d`);if(!l)return;let u=ps(r,180),d=1/0,f=-1/0,p=1/0,m=-1/0;for(let e of u)e.x<d&&(d=e.x),e.x>f&&(f=e.x),e.z<p&&(p=e.z),e.z>m&&(m=e.z);let h=(d+f)*.5,g=(p+m)*.5,_=Math.max(f-d,m-p,1)+20,v=11*i,y=(Math.min(s,c)-v*2)/_;l.clearRect(0,0,s,c),l.fillStyle=n.selected?`rgba(12, 18, 28, 0.85)`:`rgba(8, 12, 20, 0.72)`,l.fillRect(0,0,s,c),l.beginPath();for(let e=0;e<u.length;e++){let t=u[e],n=s*.5+(t.x-h)*y,r=c*.5+(t.z-g)*y;e===0?l.moveTo(n,r):l.lineTo(n,r)}l.strokeStyle=n.selected?`rgba(255, 59, 46, 0.95)`:`rgba(242, 245, 250, 0.55)`,l.lineWidth=(n.selected?2.4:2)*i,l.lineJoin=`round`,l.lineCap=`round`,l.stroke();let b=u[0],x=u[Math.min(4,u.length-1)],S=s*.5+(b.x-h)*y,C=c*.5+(b.z-g)*y,w=x.x-b.x,T=x.z-b.z,E=Math.hypot(w,T)||1,D=-T/E*5*i,O=w/E*5*i;l.beginPath(),l.moveTo(S-D,C-O),l.lineTo(S+D,C+O),l.strokeStyle=n.selected?`#ff3b2e`:`rgba(242, 245, 250, 0.85)`,l.lineWidth=2.2*i,l.stroke()}var hs={Digit0:`N`,Numpad0:`N`,KeyN:`N`,Digit1:1,Numpad1:1,Digit2:2,Numpad2:2,Digit3:3,Numpad3:3,Digit4:4,Numpad4:4,Digit5:5,Numpad5:5,KeyR:`R`},gs=[`KeyW`,`KeyA`,`KeyS`,`KeyD`,`ArrowLeft`,`ArrowRight`,`ShiftLeft`,`ShiftRight`,`CapsLock`],_s=new Set([`ArrowUp`,`ArrowDown`,`ArrowLeft`,`ArrowRight`,`Space`,`KeyC`,`KeyV`,`ShiftLeft`,`ShiftRight`,`CapsLock`]);function vs(e){if(!(e instanceof HTMLElement))return!1;let t=e.tagName;return t===`INPUT`||t===`TEXTAREA`||t===`SELECT`||e.isContentEditable}var ys=class{keys=new Set;resetPressed=!1;pausePressed=!1;gearPress=null;shiftPress=0;firePress=!1;touchThrottle=0;touchBrake=0;touchSteer=0;phoneThrottle=0;phoneBrake=0;phoneSteer=0;phoneHandbrake=0;phoneUntil=0;state={throttle:0,brake:0,handbrake:0,steer:0,reset:!1,pause:!1,gear:null,shiftDelta:0,fire:!1,jump:!1,descend:!1,lookDown:!1};constructor(){window.addEventListener(`keydown`,e=>{if(vs(e.target))return;this.keys.add(e.code),e.code===`Backspace`&&(this.resetPressed=!0,e.preventDefault()),(e.code===`Escape`||e.code===`KeyP`)&&(this.pausePressed=!0,e.preventDefault());let t=hs[e.code];t!==void 0&&(this.gearPress=t,e.preventDefault()),e.code===`ArrowUp`&&!e.repeat&&(this.shiftPress=1),e.code===`ArrowDown`&&!e.repeat&&(this.shiftPress=-1),e.code===`KeyF`&&!e.repeat&&(this.firePress=!0),_s.has(e.code)&&e.preventDefault()}),window.addEventListener(`keyup`,e=>{vs(e.target)||this.keys.delete(e.code)})}clearDriveKeys(){for(let e of gs)this.keys.delete(e);this.clearTouchDrive(),this.phoneUntil=0}setTouchDrive(e){e.throttle!==void 0&&(this.touchThrottle=e.throttle),e.brake!==void 0&&(this.touchBrake=e.brake),e.steer!==void 0&&(this.touchSteer=e.steer)}clearTouchDrive(){this.touchThrottle=0,this.touchBrake=0,this.touchSteer=0}setPhoneDrive(e){this.phoneThrottle=e.throttle,this.phoneBrake=e.brake,this.phoneSteer=e.steer,this.phoneHandbrake=e.handbrake,this.phoneUntil=performance.now()+500}requestPause(){this.pausePressed=!0}requestShift(e){this.shiftPress=e}getState(){let e=this.keys.has(`KeyW`),t=this.keys.has(`KeyS`),n=this.keys.has(`KeyA`)||this.keys.has(`ArrowLeft`),r=this.keys.has(`KeyD`)||this.keys.has(`ArrowRight`),i=this.keys.has(`ShiftLeft`)||this.keys.has(`ShiftRight`)||this.keys.has(`CapsLock`),a=this.resetPressed;this.resetPressed=!1;let o=this.pausePressed;this.pausePressed=!1;let s=this.gearPress;this.gearPress=null;let c=this.shiftPress;this.shiftPress=0;let l=this.firePress;this.firePress=!1;let u=performance.now()<this.phoneUntil,d=this.state;d.throttle=Math.max(+!!e,this.touchThrottle,u?this.phoneThrottle:0),d.brake=Math.max(+!!t,this.touchBrake,u?this.phoneBrake:0),d.handbrake=Math.max(+!!i,u?this.phoneHandbrake:0);let f=+!!n+(r?-1:0)+this.touchSteer+(u?this.phoneSteer:0);return d.steer=Math.max(-1,Math.min(1,f)),d.reset=a,d.pause=o,d.gear=s,d.shiftDelta=c,d.fire=l,d.jump=this.keys.has(`Space`),d.descend=this.keys.has(`KeyC`),d.lookDown=this.keys.has(`KeyV`),d}},bs=`pad-focus`;function xs(e){if(e.closest(`.hidden`))return!1;let t=e.getBoundingClientRect();return t.width>2&&t.height>2}function Ss(){let e=[...document.querySelectorAll(`.overlay, [role='dialog']`)].filter(e=>e.id===`phone-link`||e.id===`mobile-gate`?!1:xs(e)).at(-1);if(!e)return[];let t=[...e.querySelectorAll(`button`)].filter(e=>e.disabled||e.getAttribute(`aria-hidden`)===`true`||e.closest(`#phone-link, #mobile-gate`)?!1:xs(e));t.sort((e,t)=>{let n=e.getBoundingClientRect(),r=t.getBoundingClientRect();return Math.abs(n.top-r.top)>22?n.top-r.top:n.left-r.left});let n=[];for(let e of t){let t=e.getBoundingClientRect().top,r=n[n.length-1];r&&Math.abs(r[0].getBoundingClientRect().top-t)<=22?r.push(e):n.push([e])}return n}var Cs=null;function ws(e){document.querySelectorAll(`.${bs}`).forEach(e=>e.classList.remove(bs)),Cs=e,e.classList.add(bs)}function Ts(){document.querySelectorAll(`.${bs}`).forEach(e=>e.classList.remove(bs)),Cs=null}function Es(e){let t=document.getElementById(e);t instanceof HTMLButtonElement&&xs(t)&&t.click()}function Ds(e){if(e===`race`){Es(`start-btn`);return}if(e===`garage`){Es(`home-garage-btn`);return}if(e===`back`){Ss().flat().find(e=>/back/i.test(e.textContent||``)||/back/i.test(e.id))?.click();return}if(e===`ok`){let e=Cs&&document.contains(Cs)&&xs(Cs)?Cs:Ss()[0]?.[0];if(!e)return;ws(e),e.click();return}let t=Ss();if(!t.length)return;if(!Cs||!document.contains(Cs)){let e=t[0]?.[0];e&&ws(e);return}let n=0,r=0;for(let e=0;e<t.length;e++){let i=t[e].indexOf(Cs);if(i>=0){n=e,r=i;break}}e===`left`&&--r,e===`right`&&(r+=1),e===`up`&&--n,e===`down`&&(n+=1),n=Math.max(0,Math.min(t.length-1,n));let i=t[n];r=Math.max(0,Math.min(i.length-1,r));let a=i[r];a&&ws(a)}var Os=new Set([`up`,`down`,`left`,`right`,`ok`,`back`,`race`,`garage`]),ks=class{ws=null;screen=`menu`;linked=!1;wantOpen=!1;ping=null;code=``;handlers;constructor(e){this.handlers=e,this.attach()}attach(){document.addEventListener(`click`,e=>{let t=e.target;!(t instanceof Element)||!t.closest(`#phone-pad-btn`)||(e.preventDefault(),e.stopPropagation(),this.showModal())}),document.getElementById(`phone-link-close`)?.addEventListener(`click`,e=>{e.stopPropagation(),this.hideModal()}),document.getElementById(`phone-link-unlink`)?.addEventListener(`click`,e=>{e.stopPropagation(),this.unlink()}),document.addEventListener(`keydown`,e=>{if(e.key!==`Escape`)return;let t=document.getElementById(`phone-link`);!t||t.classList.contains(`hidden`)||(e.preventDefault(),e.stopPropagation(),this.hideModal())},!0)}setScreen(e){let t=e!==this.screen;this.screen=e,t&&this.linked&&this.send({t:`pad-screen`,screen:e}),e===`drive`&&this.hideModal()}showModal(){document.getElementById(`phone-link`)?.classList.remove(`hidden`),this.wantOpen=!0,!this.ws||this.ws.readyState>1?this.connect():this.paint()}showConnectScreen(){if(this.linked=!1,this.setLinked(!1),Ts(),this.wantOpen=!0,document.getElementById(`phone-link`)?.classList.remove(`hidden`),this.ws&&this.ws.readyState===WebSocket.OPEN&&this.code){let e=document.getElementById(`phone-link-code`);e&&(e.textContent=this.code),this.setStatus(`Scan to play`);return}this.code=``,!this.ws||this.ws.readyState>1?this.connect():this.paint()}hideModal(){document.getElementById(`phone-link`)?.classList.add(`hidden`)}unlink(){this.wantOpen=!1,this.linked=!1,this.code=``,this.stopPing(),this.ws?.close(),this.ws=null,Ts(),this.setLinked(!1),this.setStatus(`Phone unlinked`);let e=document.getElementById(`phone-link-qr`);e instanceof HTMLImageElement&&e.removeAttribute(`src`),this.hideModal()}connect(){let e=Vt();if(!e){this.setStatus(`Game server isn’t running — start it, then open this again`);return}this.setStatus(`Connecting…`);let t=new WebSocket(e);this.ws=t,t.addEventListener(`open`,()=>{this.ws===t&&(this.send({t:`pad-host`}),this.stopPing(),this.ping=setInterval(()=>this.send({t:`ping`,n:Date.now()}),8e3))}),t.addEventListener(`message`,e=>{this.ws!==t||typeof e.data!=`string`||this.onMessage(e.data)}),t.addEventListener(`close`,()=>{if(this.ws!==t)return;this.ws=null,this.stopPing();let e=this.linked,n=e||this.wantOpen;this.linked=!1,this.code=``,this.setLinked(!1),Ts(),n&&this.showConnectScreen(),e&&this.handlers.onStatus(`Phone disconnected`)}),t.addEventListener(`error`,()=>{this.ws===t&&this.setStatus(`Can’t reach the game server`)})}onMessage(e){let t;try{t=JSON.parse(e)}catch{return}if(t.t===`pad-ready`&&typeof t.code==`string`){this.code=t.code;let e=typeof t.lanHost==`string`?t.lanHost:null;this.paintQr(this.pageUrl(this.code,e)),this.setStatus(`Scan to play`);return}if(t.t===`pad-linked`){this.linked=!0,this.setLinked(!0),this.setStatus(`Phone linked`),this.handlers.onStatus(`Phone linked — tilt it to steer`),this.send({t:`pad-screen`,screen:this.screen});return}if(t.t===`pad-unlinked`||t.t===`pad-end`){let e=this.linked;this.showConnectScreen(),e&&this.handlers.onStatus(`Phone disconnected`);return}if(t.t===`pad-menu`&&typeof t.key==`string`&&Os.has(t.key)){this.handlers.onMenu(t.key);return}if(t.t===`pad-drive`){let e=t.shift===1||t.shift===-1?t.shift:0;this.handlers.onDrive({steer:As(t.steer,-1,1),throttle:As(t.throttle,0,1),brake:As(t.brake,0,1),handbrake:As(t.handbrake,0,1),shift:e,pause:t.pause===!0})}}pageUrl(e,t){return`${(location.hostname===`localhost`||location.hostname===`127.0.0.1`)&&t?`${location.protocol}//${t}${location.port?`:${location.port}`:``}`:location.origin}${`/racer-online/`.replace(/\/?$/,`/`)}?pad=${encodeURIComponent(e)}`}async paintQr(n){let r=document.getElementById(`phone-link-qr`),i=document.getElementById(`phone-link-code`);if(i&&(i.textContent=this.code),r instanceof HTMLImageElement)try{r.src=await(await t(()=>import(`./browser-pBwlB2M7.js`).then(t=>e(t.default,1)),__vite__mapDeps([0,1]))).toDataURL(n,{width:280,margin:1,errorCorrectionLevel:`M`}),r.classList.remove(`hidden`)}catch{this.setStatus(n)}}paint(){let e=document.getElementById(`phone-link-code`);e&&this.code&&(e.textContent=this.code),this.setStatus(this.linked?`Phone linked`:this.code?`Scan to play`:`Connecting…`)}setLinked(e){document.getElementById(`phone-pad-btn`)?.classList.toggle(`is-linked`,e),document.getElementById(`phone-link-unlink`)?.classList.toggle(`hidden`,!e)}setStatus(e){let t=document.getElementById(`phone-link-status`);t&&(t.textContent=e)}send(e){this.ws?.readyState===WebSocket.OPEN&&this.ws.send(JSON.stringify(e))}stopPing(){this.ping!=null&&clearInterval(this.ping),this.ping=null}};function As(e,t,n){let r=typeof e==`number`?e:Number(e);return Number.isFinite(r)?Math.max(t,Math.min(n,r)):0}function js(){if(typeof window>`u`||typeof navigator>`u`)return!1;let e=window.matchMedia(`(pointer: coarse)`).matches,t=window.matchMedia(`(hover: none)`).matches;return(navigator.maxTouchPoints>0||`ontouchstart`in window)&&e&&t}function Ms(){let e=window.visualViewport;return e&&e.width>0&&e.height>0?{w:Math.round(e.width),h:Math.round(e.height)}:{w:window.innerWidth,h:window.innerHeight}}var Ns=class{root;input;bound=!1;active=!1;left=!1;right=!1;gas=!1;brake=!1;pointers=new Map;constructor(e){this.input=e,this.root=document.getElementById(`touch-controls`)}syncMode(e){document.documentElement.classList.toggle(`touch-mode`,e),e&&!this.bound&&this.bind(),e||(this.setVisible(!1),this.clearAll())}setVisible(e){this.active=e,this.root&&(this.root.classList.toggle(`hidden`,!e),this.root.setAttribute(`aria-hidden`,e?`false`:`true`),e||this.clearAll())}bind(){!this.root||this.bound||(this.bound=!0,this.root.querySelectorAll(`[data-touch]`).forEach(e=>{let t=e.dataset.touch;if(!t)return;let n=n=>{if(this.active){n.preventDefault(),n.stopPropagation();try{e.setPointerCapture(n.pointerId)}catch{}this.pointers.set(n.pointerId,t),e.classList.add(`is-active`),this.applyAction(t,!0)}},r=e=>{this.releasePointer(e.pointerId)&&e.preventDefault()};e.addEventListener(`pointerdown`,n),e.addEventListener(`pointerup`,r),e.addEventListener(`pointercancel`,r),e.addEventListener(`lostpointercapture`,r),e.addEventListener(`contextmenu`,e=>e.preventDefault())}),window.addEventListener(`pointerup`,e=>this.releasePointer(e.pointerId)),window.addEventListener(`pointercancel`,e=>this.releasePointer(e.pointerId)),window.addEventListener(`blur`,()=>this.clearAll()),window.addEventListener(`pagehide`,()=>this.clearAll()),document.addEventListener(`visibilitychange`,()=>{document.hidden&&this.clearAll()}))}releasePointer(e){let t=this.pointers.get(e);if(t){this.pointers.delete(e);for(let e of this.pointers.values())if(e===t)return t;return this.root?.querySelectorAll(`[data-touch="${t}"]`).forEach(e=>e.classList.remove(`is-active`)),this.applyAction(t,!1),t}}applyAction(e,t){switch(e){case`left`:this.left=t;break;case`right`:this.right=t;break;case`gas`:this.gas=t;break;case`brake`:this.brake=t;break;case`shift-up`:t&&this.input.requestShift(1);return;case`shift-down`:t&&this.input.requestShift(-1);return}this.pushAxes()}pushAxes(){this.input.setTouchDrive({throttle:+!!this.gas,brake:+!!this.brake,steer:+!!this.left+(this.right?-1:0)})}clearAll(){this.left=this.right=this.gas=this.brake=!1,this.pointers.clear(),this.root?.querySelectorAll(`[data-touch].is-active`).forEach(e=>e.classList.remove(`is-active`)),this.input.clearTouchDrive()}};function Ps(e){return Xe[e].max*3.6}var Fs=.1,Is=[`R`,`N`,1,2,3,4,5],Ls=.08,Rs=class{state;mesh;manual;shiftTimer=0;powerMul=1;animalHitPenalty=0;hitSpeedCap=1/0;constructor(e,t,n,r=!1){this.mesh=e,this.manual=r,this.state={position:t.clone(),heading:n,speed:0,steerAngle:0,gear:1,driftSlip:0,groundPitch:0},this.syncMesh()}reset(e,t){this.state.position.copy(e),this.state.heading=t,this.state.speed=0,this.state.steerAngle=0,this.state.gear=1,this.state.driftSlip=0,this.state.groundPitch=0,this.shiftTimer=0,this.powerMul=1,this.animalHitPenalty=0,this.hitSpeedCap=1/0,this.driftYaw=0,this.leanSmooth=0,this.syncMesh()}setGear(e){this.shiftTimer>0&&e===this.state.gear||e===`R`&&this.state.speed>2||e!==`R`&&e!==`N`&&this.state.speed<-2||e!==this.state.gear&&(this.state.gear=e,this.shiftTimer=Fs)}_physInput={throttle:0,brake:0,handbrake:0,steer:0,reset:!1,pause:!1,gear:null,shiftDelta:0,fire:!1,jump:!1,descend:!1,lookDown:!1};update(e,t){if(this.mesh.userData.kind===`bird`){this.updateBirdFly(e,t);return}let n=this.state;if(this.shiftTimer=Math.max(0,this.shiftTimer-e),this.manual&&t.gear!=null&&this.setGear(t.gear),this.manual&&t.shiftDelta!==0){let e=Is.indexOf(n.gear)+t.shiftDelta;e>=0&&e<Is.length&&this.setGear(Is[e])}this.manual&&n.gear===`N`&&t.throttle>0&&t.brake===0&&this.setGear(1);let r=t;if(this.animalHitPenalty>0){let n=this._physInput;n.throttle=t.throttle,n.brake=t.brake,n.handbrake=t.handbrake,n.steer=t.steer,n.reset=t.reset,n.pause=t.pause,n.gear=t.gear,n.shiftDelta=t.shiftDelta,n.fire=t.fire,n.jump=t.jump,n.descend=t.descend,n.lookDown=t.lookDown,this.animalHitPenalty=Math.max(0,this.animalHitPenalty-e),n.throttle=t.throttle*.2,n.brake=Math.max(t.brake,.22),n.handbrake=0,r=n}dt(n,e,r,this.powerMul),this.hitSpeedCap<1e6&&Math.abs(n.speed)>this.hitSpeedCap&&(n.speed=Math.sign(n.speed||1)*this.hitSpeedCap),this.animalHitPenalty<=0&&(this.hitSpeedCap=1/0),this.updateDriftPose(e),this.syncMesh(e),this.animateWheels(e)}updateBirdFly(e,t){let n=this.state,r=t.handbrake>.5?2.4:1,i=28*r,a=2.1*r,o=18*r;n.heading+=t.steer*a*e;let s=t.throttle-t.brake,c=Math.sin(n.heading),l=Math.cos(n.heading);n.position.x+=c*s*i*e,n.position.z+=l*s*i*e,t.jump&&(n.position.y+=o*e),t.descend&&(n.position.y-=o*e),n.position.y=Math.max(1.2,Math.min(220,n.position.y)),n.speed=s*i,n.steerAngle=t.steer*.35,n.gear=`N`,n.driftSlip=0,n.groundPitch=0,this.syncMesh(e),this.animateBirdWings(e,Math.abs(s)+(t.jump||t.descend?1:0))}birdWingPhase=0;animateBirdWings(e,t){let n=this.mesh.userData.wings;if(!n?.length)return;let r=8+t*10;this.birdWingPhase+=e*r;let i=Math.sin(this.birdWingPhase)*(.35+t*.25);n[0]&&(n[0].rotation.z=i),n[1]&&(n[1].rotation.z=-i)}leanSmooth=0;driftYaw=0;aiShift(e){if(this.shiftTimer>0)return;let t=this.kmh,n=Math.max(e.maxKappa,e.nearKappa),r=n>.024||e.turnAngle>.82||e.cornerKmh<95&&e.turnAngle>.5&&n>.016,i=n<.012&&e.turnAngle<.4&&e.cornerKmh>Ps(3)*.85,a=3;for(a=t<42?1:t<72||r?2:i&&t>Ps(3)*.68?t>Ps(4)*.62?5:4:!r&&t>Ps(3)*.78?t>Ps(4)*.7?5:4:3;a>1&&t<Xe[a].pullFrom*3.6*.92;)--a;a!==this.state.gear&&this.setGear(a)}syncCollision(){this.syncMesh()}updateDriftPose(e){let t=this.state.driftSlip||0,n=1-Math.exp(-(Math.abs(t)>.02?10:7)*e);this.driftYaw+=(t-this.driftYaw)*n}syncMesh(e){let t=this.state;for(;t.heading>Math.PI;)t.heading-=Math.PI*2;for(;t.heading<-Math.PI;)t.heading+=Math.PI*2;if(this.mesh.position.copy(t.position),this.mesh.position.y=t.position.y+Ls,this.mesh.rotation.order=`YXZ`,this.mesh.rotation.y=t.heading+this.driftYaw,this.mesh.userData.kind===`bird`){this.mesh.rotation.z=0,this.mesh.rotation.x=0,this.leanSmooth=0;return}let n=this.mesh.userData.kind===`bike`,r=n?.48:.1,i=n?34:50,a=Ot.clamp(-t.steerAngle*(Math.abs(t.speed)/i)-this.driftYaw*(n?1.15:.4),-r,r),o=n?9:14;if(e&&e>0){let t=1-Math.exp(-o*e);this.leanSmooth+=(a-this.leanSmooth)*t}else this.leanSmooth=a;this.mesh.rotation.z=this.leanSmooth,this.mesh.rotation.x=Ot.clamp(-t.speed*55e-5,-.045,.03)+(t.groundPitch||0)}animateWheels(e){let t=this.mesh.userData.steers,n=this.mesh.userData.spinners,r=this.mesh.userData.wheelRadius??.38;if(!t||!n)return;let i=this.state.speed*e/r,a=typeof this.mesh.userData.steerCount==`number`?Math.max(0,this.mesh.userData.steerCount):Math.min(2,t.length);t.forEach((e,t)=>{e.rotation.y=t<a?this.state.steerAngle*.45:0}),n.forEach(e=>e.rotateX(-i))}get kmh(){return Math.abs(this.state.speed)*3.6}get rpmNorm(){let e=this.state.gear,t=this.kmh;if(e===`N`)return t<2?.16:Math.min(.95,.2+t/55);if(e===`R`){let e=Xe.R.max*3.6;return Math.max(0,Math.min(1,t/Math.max(6,e)))}let n=Xe[e],r=n.max*3.6,i=n.pullFrom*3.6;if(t<=i*.85)return Math.max(.08,t/Math.max(8,i)*.22);let a=Math.max(8,r-i*.85),o=(t-i*.85)/a;return Math.max(.2,Math.min(1.05,.2+o*.85))}get gearLabel(){return String(this.state.gear)}},zs=2.8,Bs=class{vehicle;laps=0;raceDone=!1;disabledUntil=0;godBoost=1;laneOffset;skill;aggression;lookAheadBias;raceAge=0;lastT=null;gates=new as;stuckTimer=0;line=null;linePath=null;debugLine=null;_aim=new I;_near=new I;_far=new I;_tan=new I;_n=new I;_tmp=new I;_driveInput={throttle:0,brake:0,handbrake:0,steer:0,reset:!1,pause:!1,gear:null,shiftDelta:0,fire:!1,jump:!1,descend:!1,lookDown:!1};_shiftOpts={maxKappa:0,nearKappa:0,turnAngle:0,cornerKmh:0};constructor(e,t,n,r=0){this.vehicle=e,this.laneOffset=Ot.clamp(t,-2.8,zs),this.skill=n,this.aggression=Math.min(1.22,.98+n*.08),this.lookAheadBias=.92+r%5*.03+n*.035}get progress(){return this.laps+(this.lastT??0)}get racingOffset(){return this.laneOffset}resetProgress(){this.lastT=null,this.laps=0,this.gates.reset(),this.stuckTimer=0,this.raceAge=0,this.raceDone=!1}markRaceDone(){this.raceDone=!0}respawn(){this.disabledUntil=0,this.lastT=null,this.stuckTimer=0,this.gates.reset()}warmLine(e){this.ensureLine(e)}ensureLine(e){return(!this.line||this.linePath!==e)&&(this.line=ds.trace(e,this.laneOffset,720),this.linePath=e),this.line}update(e,t,n,r,i=[]){this.raceAge+=e;let a=Math.min(1,this.raceAge/.65),o=a*a*(3-2*a),s=this.ensureLine(t),c=this.vehicle.state.position,l=this.lastT,u=l==null?ss(t,c).t:cs(t,c,l).t;if(this.lastT=u,l!=null&&!this.raceDone&&(this.gates.update(l,u),l>.85&&u<.15&&this.gates.readyForFinish&&(this.laps+=1,this.gates.reset())),this.raceDone){this.coastFinished(e,s,u);return}let d=Math.abs(this.vehicle.state.speed),f=Math.max(6,d);s.tangentAtT(u,this._tan),this._n.set(-this._tan.z,0,this._tan.x),s.pointAtT(u,this._aim);let p=-((c.x-this._aim.x)*this._n.x+(c.z-this._aim.z)*this._n.z),m=Math.atan2(this._tan.x,this._tan.z)-this.vehicle.state.heading;for(;m>Math.PI;)m-=Math.PI*2;for(;m<-Math.PI;)m+=Math.PI*2;t.getTangentAt(u,this._tmp).normalize();let h=-this._tmp.z,g=this._tmp.x;t.getPointAt(u,this._tmp);let _=(c.x-this._tmp.x)*h+(c.z-this._tmp.z)*g,v=Math.abs(_)>5;if(d<2.5||v&&d<8||Math.abs(p)>2.4&&v&&d<14?this.stuckTimer+=e:this.stuckTimer=Math.max(0,this.stuckTimer-e*.5),this.stuckTimer>.85){this.snapToLine(t,u,s),this.stuckTimer=0;return}Math.abs(m)>Math.PI*.55&&(this.vehicle.state.heading+=Math.sign(m)*Math.min(Math.abs(m),3.2*e),this.vehicle.state.speed<0&&(this.vehicle.state.speed=Math.abs(this.vehicle.state.speed)*.2));let y=Ot.clamp((18+f*.85)*this.lookAheadBias,20,78);Math.abs(p)>1.2&&(y*=Ot.clamp(1.15-Math.abs(p)*.18,.55,1)),o<.45&&(y=Math.min(y,32));let{maxKappa:b,nearKappa:x,turnAngle:S}=s.curvatureAhead(u,Math.max(y,42)),C=this.vehicle.kmh,w=Math.max(b,x,1e-4),T=Math.sqrt(88/w)*3.6,E=Ps(3),D=Ps(5),O=1.15+Math.max(0,this.skill-1.4)*.28,k=D*O,A=w<.011&&S<.35&&T>E,j;j=A?Math.min(k*.58,D*.72+this.skill*10):Math.min(k*.52,D*.62+this.skill*12);let ee=Math.min(j,T);this._shiftOpts.maxKappa=b,this._shiftOpts.nearKappa=x,this._shiftOpts.turnAngle=S,this._shiftOpts.cornerKmh=T,this.vehicle.aiShift(this._shiftOpts);let te=Ot.clamp(y*.32,8,22),ne=y;s.sampleAhead(u,te,this._near,this._tan),s.sampleAhead(u,ne,this._far,this._tan);let M=Math.abs(p)>1.5?.55:.38,re=this._near.x*M+this._far.x*(1-M),N=this._near.z*M+this._far.z*(1-M),ie=Math.atan2(re-c.x,N-c.z),P=Math.atan2(this._tan.x,this._tan.z),F=.88,ae=Math.atan2(Math.sin(P)*(1-F)+Math.sin(ie)*F,Math.cos(P)*(1-F)+Math.cos(ie)*F)-this.vehicle.state.heading;for(;ae>Math.PI;)ae-=Math.PI*2;for(;ae<-Math.PI;)ae+=Math.PI*2;let oe=1.55+this.skill*.4,I=Ot.clamp(Math.atan2(p*oe,Math.max(5,d))*1.85,-1,1),se=1,ce=0,le=0,ue=Math.sin(this.vehicle.state.heading),de=Math.cos(this.vehicle.state.heading);for(let e of i){if(e===this.vehicle)continue;let t=e.state.position.x-c.x,n=e.state.position.z-c.z,r=t*ue+n*de;if(r<-1.5||r>14)continue;let i=t*de-n*ue;if(Math.abs(i)>4.8)continue;let a=r>0?1-r/14:.35,s=1-Math.min(1,Math.abs(i)/4.8);if(r>0&&(se=Math.min(se,1-a*(.6+s*.35)),r<8&&Math.abs(i)<3.4&&(ce=Math.max(ce,a*(.4+s*.55)))),Math.abs(i)<3.2&&r>-.5&&r<10){let e=i>=0?-1:1,t=this.laneOffset+e*.8;Math.abs(t)<=2.8&&(le+=e*a*s*.05*o)}}le=Ot.clamp(le,-.07,.07);let fe=2.55+this.skill*.35,L=Ot.clamp(ae*fe+I+le,-1,1),pe=Math.abs(ae),R=ce,z=C-ee;z>18&&S>.36&&(R=Math.max(R,Ot.clamp(.18+z/90,.18,.85))),x>.017&&z>14&&(R=Math.max(R,.24+x*12)),b>.024&&z>16&&(R=Math.max(R,.28+b*12)),S>.7&&z>12&&(R=Math.max(R,.34+Math.min(.38,S*.28))),pe>.55&&C>110&&z>6&&(R=Math.max(R,.28)),pe>.9&&C>90&&(R=Math.max(R,.55)),Math.abs(p)>2.2&&C>100&&(R=Math.max(R,.16+Math.min(.32,(Math.abs(p)-2.2)*.16))),o<.35&&S>.55&&C>120&&(R=Math.max(R,.28)),R=Math.min(1,R*(.85-this.skill*.1));let me=this.aggression*se*(.9+.1*o);C<35&&(me*=.85+C/35*.15),z>14&&(me*=Ot.clamp(1-z/130,.18,1)),T>j&&C>j-28&&(me*=Ot.clamp((j+22-C)/40,.35,1)),R>.5?me*=.16:pe>.6?me*=.82:b>.024&&z>8&&(me*=.92),Math.abs(p)>2.4&&(me*=.92);let he=u-n;he>.5&&--he,he<-.5&&(he+=1),this.vehicle.powerMul=O*this.godBoost,he<-.1?me=Math.min(1,me+(.08+Math.min(.1,-he*.4))*o):he>.45&&(me*=.95);let ge=this._driveInput;ge.throttle=me,ge.brake=R,ge.steer=L,this.vehicle.update(e,ge)}coastFinished(e,t,n){let r=this.vehicle.state.position;t.sampleAhead(n,18,this._far,this._tan);let i=Math.atan2(this._far.x-r.x,this._far.z-r.z)-this.vehicle.state.heading;for(;i>Math.PI;)i-=Math.PI*2;for(;i<-Math.PI;)i+=Math.PI*2;let a=this.vehicle.kmh,o=a<44?.35:.08,s=a>56?.35:0;this.vehicle.powerMul=1,this.vehicle.state.gear!==2&&this.vehicle.state.gear!==1&&this.vehicle.setGear(2);let c=this._driveInput;c.throttle=o,c.brake=s,c.steer=Ot.clamp(i*2.2,-1,1),this.vehicle.update(e,c)}snapToLine(e,t,n){let r=n??this.ensureLine(e);r.pointAtT(t,this.vehicle.state.position),r.tangentAtT(t,this._tan),this.vehicle.state.heading=Math.atan2(this._tan.x,this._tan.z),this.vehicle.state.speed=6,this.vehicle.state.steerAngle=0,this.vehicle.setGear(1),this.vehicle.syncCollision()}debugDrawLine(e){let t=this.vehicle.mesh.parent;if(!t)return;let n=e.points.map(e=>e.clone().setY(.2));if(n.push(n[0].clone()),this.debugLine)this.debugLine.geometry.setFromPoints(n);else{let e=new Pt().setFromPoints(n);this.debugLine=new xt(e,new Qe({color:16737962,transparent:!0,opacity:.45})),t.add(this.debugLine)}}},Vs=1e3/30;Vs*2.2;var Hs=Vs*2,Us=27;function Ws(e){if(e.byteLength<10)return null;let t=new DataView(e);if(t.getUint8(0)!==1)return null;let n=t.getFloat64(1,!0),r=t.getUint8(9),i=10+r*Us;if(e.byteLength<i||r>6)return null;let a=[],o=10,s=new Uint8Array(e);for(let e=0;e<r;e++){let e=o;for(;e<o+8&&s[e]!==0;)e++;let n=String.fromCharCode(...s.subarray(o,e));o+=8;let r=t.getFloat32(o,!0);o+=4;let i=t.getFloat32(o,!0);o+=4;let c=t.getFloat32(o,!0);o+=4;let l=t.getFloat32(o,!0);o+=4;let u=String.fromCharCode(t.getUint8(o++)||49),d=t.getUint8(o++)||1,f=(t.getUint8(o++)&1)!=0;a.push({id:n,x:r,z:i,h:c,s:l,g:u,lap:d,wrecked:f})}return{at:n,motions:a}}var Gs=220,Ks=[{urls:`stun:stun.l.google.com:19302`}],qs=class{selfId=``;links=new Map;lastSeqIn=new Map;lastAt=new Map;seqOut=0;sendSignal;onPose;constructor(e,t){this.sendSignal=e,this.onPose=t}setSelf(e){this.selfId=e}sync(e){if(!this.selfId)return;let t=new Set;for(let n of e)n&&n!==this.selfId&&t.add(n);for(let e of[...this.links.keys()])t.has(e)||this.drop(e);for(let e of t)this.ensure(e)}handleSignal(e,t){if(!this.selfId||!e||e===this.selfId||t.kind===`offer`&&this.selfId<e)return;let n=this.links.get(e)??this.ensure(e);!n||n.dead||this.applySignal(e,n,t).catch(()=>this.scheduleRetry(e))}sendPose(e){if(!this.selfId)return;let t=Js(e,this.seqOut=this.seqOut+1&65535);for(let e of this.links.values()){let n=e.dc;if(!(!n||n.readyState!==`open`||n.bufferedAmount>65536))try{n.send(t)}catch{}}}fresh(e,t){let n=this.lastAt.get(e);return n!=null&&t-n<Gs}close(){for(let e of[...this.links.keys()])this.drop(e);this.lastSeqIn.clear(),this.lastAt.clear(),this.selfId=``}ensure(e){let t=this.links.get(e);if(t&&!t.dead)return t;if(!this.selfId||typeof RTCPeerConnection>`u`)return null;let n=new RTCPeerConnection({iceServers:Ks}),r={pc:n,dc:null,ice:[],remoteReady:!1,retry:null,dead:!1};if(this.links.set(e,r),n.onicecandidate=t=>{!t.candidate||r.dead||this.sendSignal(e,{kind:`ice`,candidate:t.candidate.toJSON()})},n.onconnectionstatechange=()=>{let t=n.connectionState;r.dead||(t===`failed`||t===`disconnected`)&&this.scheduleRetry(e)},n.ondatachannel=t=>this.bindChannel(e,r,t.channel),this.selfId<e)try{let t=n.createDataChannel(`pose`,{ordered:!1,maxRetransmits:0});this.bindChannel(e,r,t),n.createOffer().then(async t=>{r.dead||(await n.setLocalDescription(t),this.sendSignal(e,{kind:`offer`,sdp:t.sdp??``}))}).catch(()=>this.scheduleRetry(e))}catch{this.scheduleRetry(e)}return r}bindChannel(e,t,n){t.dc=n,n.binaryType=`arraybuffer`,n.onmessage=t=>{if(!(t.data instanceof ArrayBuffer))return;let n=Zs(t.data);if(!n||n.id!==e)return;let r=Ys(t.data),i=this.lastSeqIn.get(e);if(i!=null&&!Xs(r,i))return;this.lastSeqIn.set(e,r);let a=performance.now();this.lastAt.set(e,a),this.onPose(n,a)}}async applySignal(e,t,n){if(!t.dead){if(n.kind===`offer`){if(!n.sdp)return;await t.pc.setRemoteDescription({type:`offer`,sdp:n.sdp}),t.remoteReady=!0;let r=await t.pc.createAnswer();await t.pc.setLocalDescription(r),this.sendSignal(e,{kind:`answer`,sdp:r.sdp??``}),await this.flushIce(t);return}if(n.kind===`answer`){if(!n.sdp||t.pc.signalingState!==`have-local-offer`)return;await t.pc.setRemoteDescription({type:`answer`,sdp:n.sdp}),t.remoteReady=!0,await this.flushIce(t);return}if(n.candidate){if(!t.remoteReady){t.ice.push(n.candidate);return}await t.pc.addIceCandidate(n.candidate)}}}async flushIce(e){let t=e.ice.splice(0);for(let n of t)try{await e.pc.addIceCandidate(n)}catch{}}scheduleRetry(e){let t=this.links.get(e);!t||t.dead||t.retry||(t.retry=setTimeout(()=>{this.links.has(e)&&(this.drop(e),this.ensure(e))},2e3))}drop(e){let t=this.links.get(e);if(t){t.dead=!0,t.retry&&clearTimeout(t.retry);try{t.dc?.close()}catch{}try{t.pc.close()}catch{}this.links.delete(e),this.lastAt.delete(e),this.lastSeqIn.delete(e)}}};function Js(e,t){let n=new ArrayBuffer(30),r=new DataView(n),i=new Uint8Array(n);r.setUint16(0,t&65535,!0);let a=e.id.slice(0,8);for(let e=0;e<8;e++)i[2+e]=e<a.length?a.charCodeAt(e)&255:0;return r.setFloat32(10,e.x,!0),r.setFloat32(14,e.z,!0),r.setFloat32(18,e.h,!0),r.setFloat32(22,e.s,!0),i[26]=(e.g.charCodeAt(0)||49)&255,i[27]=Math.max(1,Math.min(99,e.lap|0)),n}function Ys(e){return new DataView(e).getUint16(0,!0)}function Xs(e,t){let n=e-t&65535;return n>0&&n<32768}function Zs(e){if(e.byteLength<28)return null;let t=new DataView(e),n=new Uint8Array(e),r=2;for(;r<10&&n[r]!==0;)r++;let i=String.fromCharCode(...n.subarray(2,r));return i?{id:i,x:t.getFloat32(10,!0),z:t.getFloat32(14,!0),h:t.getFloat32(18,!0),s:t.getFloat32(22,!0),g:String.fromCharCode(n[26]||49),lap:n[27]||1}:null}var Qs=110,$s=48,ec=12,tc=new I,nc=new tt,rc=new P,ic=new nt(.55,2.1,7);ic.translate(0,1.05,0);var ac=new pe(.48,10,8);function oc(e){switch(e){case`bike`:return{y:.95,spread:.55,z:.05};default:return{y:1.05,spread:1.25,z:.35}}}var sc=class{root;sparks;smoke;light;lightCore;flames=[];flameScale=[];flameMats=[];core;life;vel;smokeLife;smokeVel;tex;smokeTex;scene;anchor;origin;bike;time=0;constructor(e,t){this.anchor=e,this.scene=t;let n=String(e.userData?.kind??`car`);this.bike=n===`bike`,this.origin=oc(n),this.root=new V,this.root.name=`wreck-fire`,this.root.frustumCulled=!1,this.root.renderOrder=4,this.scene.add(this.root);let r=new ut({color:16742946,transparent:!0,opacity:.95,depthWrite:!1,depthTest:!1,blending:2});for(let e=0;e<ec;e++){let e=r.clone(),t=new J(ic,e);t.frustumCulled=!1,t.renderOrder=5,this.root.add(t),this.flames.push(t),this.flameMats.push(e),this.flameScale.push(.85+Math.random()*.95)}r.dispose();let i=new ut({color:16769162,transparent:!0,opacity:.78,depthWrite:!1,depthTest:!1,blending:2});this.core=new J(ac,i),this.core.frustumCulled=!1,this.core.renderOrder=4,this.core.position.set(0,.35,0),this.root.add(this.core),this.tex=cc(),this.smokeTex=lc(),this.life=new Float32Array(Qs),this.vel=new Float32Array(Qs*3);let a=new Float32Array(Qs*3);for(let e=0;e<Qs;e++)this.seedSpark(e,a),this.life[e]=Math.random();let o=new Pt;o.setAttribute(`position`,new Ie(a,3));let s=new T({map:this.tex,color:16761946,size:this.bike?1.05:1.65,transparent:!0,opacity:.98,depthWrite:!1,depthTest:!1,blending:2,sizeAttenuation:!0});this.sparks=new it(o,s),this.sparks.frustumCulled=!1,this.sparks.renderOrder=6,this.root.add(this.sparks),this.smokeLife=new Float32Array($s),this.smokeVel=new Float32Array($s*3);let c=new Float32Array($s*3);for(let e=0;e<$s;e++)this.seedSmoke(e,c),this.smokeLife[e]=Math.random();let l=new Pt;l.setAttribute(`position`,new Ie(c,3));let u=new T({map:this.smokeTex,color:6974058,size:this.bike?2.4:3.6,transparent:!0,opacity:.55,depthWrite:!1,depthTest:!1,blending:1,sizeAttenuation:!0});this.smoke=new it(l,u),this.smoke.frustumCulled=!1,this.smoke.renderOrder=3,this.root.add(this.smoke),this.light=new he(16738862,this.bike?9:14,this.bike?20:34),this.light.position.set(0,1.4,0),this.root.add(this.light),this.lightCore=new he(16765056,this.bike?4:7,this.bike?10:16),this.lightCore.position.set(0,.55,0),this.root.add(this.lightCore),this.syncRoot()}update(e){this.time+=e,this.syncRoot();let t=Math.min(e,.05),n=this.sparks.geometry.getAttribute(`position`),r=n.array;for(let e=0;e<Qs;e++){this.life[e]-=t*(.75+Math.random()*.55);let n=e*3;if(this.life[e]<=0){this.seedSpark(e,r);continue}this.vel[n]*=.965,this.vel[n+1]+=8.5*t,this.vel[n+2]*=.965,r[n]+=this.vel[n]*t,r[n+1]+=this.vel[n+1]*t,r[n+2]+=this.vel[n+2]*t}n.needsUpdate=!0;let i=this.smoke.geometry.getAttribute(`position`),a=i.array;for(let e=0;e<$s;e++){this.smokeLife[e]-=t*(.28+Math.random()*.22);let n=e*3;if(this.smokeLife[e]<=0){this.seedSmoke(e,a);continue}this.smokeVel[n]*=.985,this.smokeVel[n+1]+=2.4*t,this.smokeVel[n+2]*=.985,a[n]+=this.smokeVel[n]*t,a[n+1]+=this.smokeVel[n+1]*t,a[n+2]+=this.smokeVel[n+2]*t}i.needsUpdate=!0;let o=this.origin.spread;for(let e=0;e<this.flames.length;e++){let t=this.flames[e],n=.78+Math.sin(this.time*(10+e*1.9)+e)*.28+Math.random()*.1,r=this.flameScale[e]*n,i=e/ec*Math.PI*2;t.position.set(Math.sin(this.time*3.4+i)*o*.32+Math.cos(i)*o*.2,.05+e%4*.16,Math.cos(this.time*2.7+i)*o*.32+Math.sin(i)*o*.2),t.scale.set(r*.9,r*(1.25+Math.sin(this.time*16+e)*.28),r*.9),t.rotation.y=this.time*1.1+e,t.rotation.z=Math.sin(this.time*7+e)*.12;let a=this.flameMats[e];a.color.setHex(e%3==0?16773280:e%3==1?16747034:16726536),a.opacity=.78+Math.sin(this.time*18+e)*.12}let s=.85+Math.sin(this.time*14)*.2+Math.random()*.08;this.core.scale.setScalar(s*(this.bike?.85:1.15));let c=this.core.material;c.opacity=.55+Math.sin(this.time*22)*.15,this.light.intensity=(this.bike?7.5:12)+Math.sin(this.time*18)*2.8+Math.random()*1.4,this.lightCore.intensity=(this.bike?3.2:5.5)+Math.sin(this.time*24)*1.2}dispose(){this.scene.remove(this.root),this.sparks.geometry.dispose();let e=this.sparks.material;e.map=null,e.dispose(),this.smoke.geometry.dispose();let t=this.smoke.material;t.map=null,t.dispose(),this.tex.dispose(),this.smokeTex.dispose();for(let e of this.flameMats)e.dispose();this.core.material.dispose(),this.light.dispose(),this.lightCore.dispose()}syncRoot(){this.anchor.updateMatrixWorld(),this.anchor.getWorldPosition(tc),this.root.position.set(tc.x,tc.y+this.origin.y,tc.z),this.anchor.getWorldQuaternion(nc),rc.setFromQuaternion(nc,`YXZ`),this.root.rotation.set(0,rc.y,0)}seedSpark(e,t){let n=e*3,r=this.origin.spread;t[n]=(Math.random()-.5)*r*1.15,t[n+1]=Math.random()*.55,t[n+2]=this.origin.z*.15+(Math.random()-.5)*r*1.15,this.vel[n]=(Math.random()-.5)*1.4,this.vel[n+1]=2.4+Math.random()*4.2,this.vel[n+2]=(Math.random()-.5)*1.4,this.life[e]=.35+Math.random()*.65}seedSmoke(e,t){let n=e*3,r=this.origin.spread;t[n]=(Math.random()-.5)*r*.9,t[n+1]=.4+Math.random()*.8,t[n+2]=this.origin.z*.15+(Math.random()-.5)*r*.9,this.smokeVel[n]=(Math.random()-.5)*.55,this.smokeVel[n+1]=.9+Math.random()*1.6,this.smokeVel[n+2]=(Math.random()-.5)*.55,this.smokeLife[e]=.9+Math.random()*1.4}};function cc(){let e=document.createElement(`canvas`);e.width=64,e.height=64;let t=e.getContext(`2d`),n=t.createRadialGradient(32,32,1,32,32,30);n.addColorStop(0,`rgba(255,250,210,1)`),n.addColorStop(.18,`rgba(255,200,70,0.98)`),n.addColorStop(.45,`rgba(255,90,20,0.7)`),n.addColorStop(.75,`rgba(180,20,0,0.28)`),n.addColorStop(1,`rgba(40,0,0,0)`),t.fillStyle=n,t.fillRect(0,0,64,64);let r=new D(e);return r.colorSpace=te,r.needsUpdate=!0,r}function lc(){let e=document.createElement(`canvas`);e.width=64,e.height=64;let t=e.getContext(`2d`),n=t.createRadialGradient(32,32,4,32,32,30);n.addColorStop(0,`rgba(70,70,70,0.65)`),n.addColorStop(.45,`rgba(40,40,40,0.35)`),n.addColorStop(1,`rgba(20,20,20,0)`),t.fillStyle=n,t.fillRect(0,0,64,64);let r=new D(e);return r.colorSpace=te,r.needsUpdate=!0,r}function uc(e){return String(e??``).toLowerCase()===`battle`?`battle`:`race`}function dc(e){return e.kind===`bike`?`bike`:`car`}function fc(e){for(;e>Math.PI;)e-=Math.PI*2;for(;e<-Math.PI;)e+=Math.PI*2;return e}function pc(e){return fc(e)}var mc=class{id;name;kind;mesh;buffer=[];latest=null;jitterMs=0;lastArrivalAt=0;label;scene;color;accent;labelPoint=new I;labelX=NaN;labelY=NaN;labelVisible=!0;lean=0;lastUpdateAt=0;hasDisplay=!1;prevTX=0;prevTZ=0;prevTH=0;errX=0;errZ=0;delaySmooth=0;fire=null;wrecked=!1;constructor(e,t,n){this.id=e.id,this.name=e.name,this.kind=dc(e),this.color=e.color,this.accent=e.accent??16726830,this.scene=t,this.mesh=Ve(this.kind,e.color,Math.abs(e.id.charCodeAt(0)%90)+10,this.accent),qe(this.mesh),this.mesh.position.set(e.x,Ls,e.z),this.mesh.rotation.y=e.h,t.add(this.mesh),this.label=document.createElement(`div`),this.label.className=`player-tag`,this.label.textContent=e.name,n.appendChild(this.label),this.push(e,performance.now())}get lap(){return this.latest?.pose.lap}get jitter(){return this.jitterMs}rebuildMesh(e,t,n){let r=this.wrecked;this.clearFire(),this.scene.remove(this.mesh),Ue(this.mesh),this.mesh=Ve(e,t,Math.abs(this.id.charCodeAt(0)%90)+10,n),qe(this.mesh),this.scene.add(this.mesh),this.kind=e,this.color=t,this.accent=n,r&&this.setOnFire()}applyMeta(e){e.name!==this.name&&(this.name=e.name,this.label.textContent=e.name);let t=dc(e),n=e.color??this.color,r=e.accent??this.accent;(t!==this.kind||n!==this.color||r!==this.accent)&&this.rebuildMesh(t,n,r)}push(e,t=performance.now()){this.applyMeta(e);let n=performance.now();if(this.lastArrivalAt>0){let e=Math.abs(n-this.lastArrivalAt-Vs);this.jitterMs+=(e-this.jitterMs)*.15}this.lastArrivalAt=n;let r={at:t,pose:{...e,h:pc(e.h)}};this.latest=r;let i=this.buffer,a=i[i.length-1];if(a&&t<=a.at)return;i.push(r);let o=t-1e3;for(;i.length>40||i.length>2&&i[0].at<o;)i.shift()}snap(e,t=performance.now()){this.applyMeta(e);let n={...e,h:pc(e.h)},r={at:t,pose:n};this.buffer=[r],this.latest=r,this.hasDisplay=!1,this.errX=this.errZ=0,this.mesh.position.set(n.x,Ls,n.z),this.mesh.rotation.y=n.h,this.mesh.rotation.z=0}update(e,t,n,r){let i=this.buffer;if(i.length===0)return;let a=this.lastUpdateAt>0?Math.min(.05,(e-this.lastUpdateAt)/1e3):0;if(this.lastUpdateAt=e,this.wrecked&&this.latest){let e=this.latest.pose;this.mesh.position.set(e.x,Ls,e.z),this.mesh.rotation.y=e.h,this.mesh.rotation.z=0,this.fire?.update(a),this.updateLabel(t,n,r);return}this.fire?.update(a);let o=Vs*3,s=Ot.clamp(o+this.jitterMs*2,o,160);this.delaySmooth===0&&(this.delaySmooth=s),a>0&&(this.delaySmooth+=(s-this.delaySmooth)*Math.min(1,a*2.5));let c=e-this.delaySmooth,l,u,d,f,p=0;if(i.length===1){let e=i[0];l=e.pose.x,u=e.pose.z,d=e.pose.h,f=e.pose.s}else if(c<=i[0].at){let e=i[0];l=e.pose.x,u=e.pose.z,d=e.pose.h,f=e.pose.s}else{let e=i[i.length-1];if(c>=e.at){let t=i[i.length-2],n=Math.max(1,e.at-t.at),r=Math.min(Hs,c-e.at)/1e3,a=n/1e3,o=e.pose.s*Math.max(.25,Math.exp(-r/.45)),s=Math.sin(e.pose.h),m=Math.cos(e.pose.h);l=e.pose.x+s*o*r,u=e.pose.z+m*o*r;let h=fc(e.pose.h-t.pose.h);p=Ot.clamp(h/a,-2.2,2.2),d=pc(e.pose.h+p*r),f=o}else{let e=0;for(;e<i.length-2&&i[e+1].at<c;)e++;let t=i[e],n=i[e+1],r=Math.max(1,n.at-t.at),a=Ot.clamp((c-t.at)/r,0,1);l=t.pose.x+(n.pose.x-t.pose.x)*a,u=t.pose.z+(n.pose.z-t.pose.z)*a;let o=fc(n.pose.h-t.pose.h);d=pc(t.pose.h+o*a),f=t.pose.s+(n.pose.s-t.pose.s)*a,p=o/(r/1e3)}}if(!this.hasDisplay)this.prevTX=l,this.prevTZ=u,this.prevTH=d,this.hasDisplay=!0;else{let e=l-this.prevTX,t=u-this.prevTZ,n=Math.hypot(e,t),r=fc(d-this.prevTH),i=Math.max(.4,Math.abs(f)*a*2.5+.2);n>12||Math.abs(r)>1.4?this.errX=this.errZ=0:n>i&&(this.errX-=e,this.errZ-=t,this.errX=Ot.clamp(this.errX,-4,4),this.errZ=Ot.clamp(this.errZ,-4,4)),this.prevTX=l,this.prevTZ=u,this.prevTH=d}if(a>0){let e=Math.exp(-a/.2);this.errX*=e,this.errZ*=e,Math.abs(this.errX)<.005&&(this.errX=0),Math.abs(this.errZ)<.005&&(this.errZ=0)}let m=l+this.errX,h=u+this.errZ,g=d;if(this.hasDisplay&&Math.abs(f)>6){let e=m-this.mesh.position.x,t=h-this.mesh.position.z,n=Math.hypot(e,t);if(n>.05){let r=Math.atan2(e/n,t/n),i=fc(r-d),a=this.kind===`bike`?.5:.32;Math.abs(i)>a&&(g=pc(r-Math.sign(i)*a))}}let _=this.kind===`bike`?Ot.clamp(-Math.atan(Math.abs(f)*p/9.81)*.72,-.42,.42):0;if(a>0){let e=1-Math.exp(-14*a);this.lean+=(_-this.lean)*e}else this.lean=_;if(this.mesh.position.set(m,Ls,h),this.mesh.rotation.order=`YXZ`,this.mesh.rotation.y=g,this.mesh.rotation.x=0,this.mesh.rotation.z=this.kind===`bike`?this.lean:0,a>0&&Math.abs(f)>.05){let e=this.mesh.userData.spinners,t=this.mesh.userData.wheelRadius||.38;if(e){let n=f*a/t;for(let t of e)t.rotateX(-n)}}this.updateLabel(t,n,r)}setOnFire(){if(!(this.wrecked&&this.fire)&&(this.wrecked=!0,this.mesh.frustumCulled=!1,this.fire??=new sc(this.mesh,this.scene),this.hasDisplay=!1,this.errX=this.errZ=0,this.latest)){let e=this.latest.pose;this.mesh.position.set(e.x,Ls,e.z),this.mesh.rotation.y=e.h,this.mesh.rotation.z=0}}clearFire(){this.wrecked=!1,this.fire?.dispose(),this.fire=null}updateLabel(e,t,n){let r=this.labelPoint.set(this.mesh.position.x,2.2,this.mesh.position.z).project(e);if(r.z>1)this.labelVisible&&=(this.label.style.display=`none`,!1);else{this.labelVisible||=(this.label.style.display=`block`,!0);let e=Math.round((r.x*.5+.5)*t),i=Math.round((-r.y*.5+.5)*n);(e!==this.labelX||i!==this.labelY)&&(this.label.style.transform=`translate(-50%, -100%) translate(${e}px, ${i}px)`,this.labelX=e,this.labelY=i)}}dispose(e){this.clearFire(),e.remove(this.mesh),Ue(this.mesh),this.label.remove()}},hc=class{ws=null;myId=``;lastPoseAt=0;pendingPose=null;posePumpTimer=null;pingAt=0;handlers;pending=null;roster=new Map;clockOffset=0;clockReady=!1;latency=0;connected=!1;spectator=!1;spectateTargetId=``;room=``;hostId=``;trackId=``;kind=`car`;weather=`dry`;maxPlayers=8;phase=``;raceMode=`race`;event=null;myBuyIn=null;connGen=0;pingTimer=null;poseMesh=null;pendingRtc=[];finishSent=!1;refundWait=null;constructor(e){this.handlers=e}rememberPlayers(e){for(let t of e)this.roster.set(t.id,{...t})}rememberPlayer(e){this.roster.set(e.id,{...e})}localStamp(e,t){if(!Number.isFinite(e)||e<=0)return t;let n=t-e;if(!this.clockReady)this.clockOffset=n,this.clockReady=!0;else{let e=n-this.clockOffset;this.clockOffset+=Ot.clamp(e*(Math.abs(e)>40?.2:.06),-1.5,1.5)}return e+this.clockOffset}posesFromMotions(e){let t=this.kind,n=[];for(let r of e){let e=this.roster.get(r.id),i={id:r.id,name:e?.name??`RACER`,color:e?.color??15002354,accent:e?.accent,kind:e?.kind??t,pubkey:e?.pubkey,x:r.x,z:r.z,h:r.h,s:r.s,g:r.g,lap:r.lap,wrecked:r.wrecked};this.roster.set(r.id,i),n.push(i)}return n}emitState(e,t){this.rememberPlayers(e),this.handlers.onState(e,t)}peerPoseFresh(e){return this.poseMesh?.fresh(e,performance.now())??!1}ensurePoseMesh(){this.poseMesh||this.spectator||(this.poseMesh=new qs((e,t)=>this.sendRtc(e,t),(e,t)=>this.emitDirectPose(e,t)))}syncPosePeers(){this.spectator||!this.myId||(this.ensurePoseMesh(),this.poseMesh?.setSelf(this.myId),this.poseMesh?.sync(this.roster.keys()),this.flushPendingRtc())}closePoseMesh(){this.poseMesh?.close(),this.poseMesh=null}flushPendingRtc(){if(!this.myId||!this.poseMesh)return;let e=this.pendingRtc.splice(0);for(let t of e)this.poseMesh.handleSignal(t.from,t.signal)}sendRtc(e,t){!this.ws||this.ws.readyState!==WebSocket.OPEN||this.ws.send(JSON.stringify({t:`rtc`,to:e,signal:t}))}emitDirectPose(e,t){let n=this.posesFromMotions([e])[0];!n||n.id===this.myId||this.handlers.onPeerPose(n,t)}createRoom(e){this.weather=St(e.weather),this.connect({...e,mode:`create`})}joinRoom(e){this.connect({...e,mode:`join`})}spectateRoom(e){this.connect({name:`DEV`,room:e.room,targetId:e.targetId,event:e.event,mode:`spectate`})}connect(e){this.disconnect(),this.pending=e;let t=++this.connGen,n=location.protocol===`https:`?`wss`:`ws`,r=location.hostname===`localhost`||location.hostname===`127.0.0.1`,i=r?`${n}://${location.hostname}:8787`:null,a=r?`${n}://${location.host}/ws`:null,o=l(),s=null,c=u()||d()?.apiBase||null;if(!o&&c)try{let e=new URL(c,location.href);s=`${e.protocol===`https:`?`wss:`:`ws:`}//${e.host}`}catch{s=null}let f=d()?.wsUrl??null,p=o||s||f||i||a;if(!p){this.handlers.onStatus(`Sats Racer server not configured — multiplayer needs a hosted game server`),this.handlers.onError(`Sats Racer server not configured`);return}let m=e.mode===`create`?`Creating room…`:e.mode===`spectate`?`Joining live feed…`:`Joining room…`;this.handlers.onStatus(m),this.openSocket(p,e,a&&a!==p?a:null,t)}openSocket(e,t,n,r){if(r!==this.connGen)return;let i=new WebSocket(e);i.binaryType=`arraybuffer`,this.ws=i;let a=!1;i.onopen=()=>{if(r!==this.connGen||this.ws!==i){i.close();return}a=!0,this.connected=!0;let e=t.mode===`create`?`Creating room…`:t.mode===`spectate`?`Joining live feed…`:`Joining room…`;this.handlers.onStatus(e);let n=t.mode===`create`?{t:`create`,name:t.name,room:t.room||`circuit`,password:t.password??``,maxPlayers:t.maxPlayers,trackId:t.trackId,kind:t.kind===`bike`?`bike`:`car`,weather:St(t.weather),color:t.color,accent:t.accent,pubkey:t.pubkey,event:t.eventBuyInSats?{buyInSats:t.eventBuyInSats,mode:t.eventGameMode===`battle`?`battle`:`race`}:void 0}:t.mode===`spectate`?{t:`spectate`,room:t.room||`circuit`,targetId:t.targetId||``,event:t.event}:{t:`join`,name:t.name,room:t.room||`circuit`,password:t.password??``,color:t.color,accent:t.accent,pubkey:t.pubkey,event:t.eventMode||void 0};i.send(JSON.stringify(n)),this.pingAt=performance.now(),i.send(JSON.stringify({t:`ping`,n:this.pingAt})),this.startPingLoop(i,r)},i.onmessage=e=>{if(r!==this.connGen||this.ws!==i)return;let t=performance.now();if(e.data instanceof ArrayBuffer){let n=Ws(e.data);if(!n)return;let r=this.localStamp(n.at,t);this.emitState(this.posesFromMotions(n.motions),r);return}let n;try{n=JSON.parse(String(e.data))}catch{return}if(n.t===`welcome`)this.myId=n.id,this.room=n.room,this.hostId=n.hostId,this.trackId=n.trackId,this.kind=n.kind===`bike`?`bike`:`car`,this.weather=mt(n.weather,this.weather),this.maxPlayers=n.maxPlayers,this.phase=n.phase,this.event=n.event??null,this.raceMode=uc(n.raceMode??n.event?.mode),this.spectator=!!n.spectator,this.spectateTargetId=n.spectateTargetId||``,this.myBuyIn=null,this.pending=null,this.roster.clear(),this.clockReady=!1,this.rememberPlayers(n.players),this.rememberPlayer(n.you),this.syncPosePeers(),this.handlers.onStatus(this.spectator?`Watching · ${n.room}`:`Lobby · ${n.room}`),this.handlers.onWelcome({id:n.id,room:n.room,players:n.players,you:n.you,hostId:n.hostId,trackId:n.trackId,kind:this.kind,weather:this.weather,maxPlayers:n.maxPlayers,phase:n.phase,raceMode:this.raceMode,spectator:this.spectator,spectateTargetId:this.spectateTargetId||void 0});else if(n.t===`join`)this.rememberPlayer(n.player),this.syncPosePeers(),this.handlers.onJoin(n.player);else if(n.t===`leave`)n.hostId&&(this.hostId=n.hostId),this.roster.delete(n.id),this.syncPosePeers(),this.handlers.onLeave(n.id,n.hostId);else if(n.t===`rtc`){if(!this.myId){this.pendingRtc.push({from:n.from,signal:n.signal});return}this.ensurePoseMesh(),this.poseMesh?.setSelf(this.myId),this.poseMesh?.handleSignal(n.from,n.signal)}else if(n.t===`closed`)this.handlers.onClosed(n.reason||`The host left — room closed`),this.disconnect();else if(n.t===`notice`)this.handlers.onNotice(n.text);else if(n.t===`lobby`)this.hostId=n.hostId,this.trackId=n.trackId,this.kind=n.kind===`bike`?`bike`:`car`,this.weather=mt(n.weather,this.weather),this.maxPlayers=n.maxPlayers,this.event=n.event??null,this.raceMode=uc(n.raceMode??n.event?.mode??this.raceMode),this.roster.clear(),this.rememberPlayers(n.players),this.syncPosePeers(),this.handlers.onLobby({...n,weather:this.weather,raceMode:this.raceMode});else if(n.t===`start`)this.phase=`racing`,this.finishSent=!1,this.trackId=n.trackId,this.kind=n.kind===`bike`?`bike`:`car`,this.weather=mt(n.weather,this.weather),this.handlers.onStart(n.at,n.trackId,this.kind,this.weather,n.battleCubes);else if(n.t===`cubeTaken`)this.event&&={...this.event,battleEarnings:n.battleEarnings},this.handlers.onCubeTaken({cubeId:n.cubeId,byId:n.byId,byName:n.byName,sats:n.sats,earnings:n.earnings,battleEarnings:n.battleEarnings});else if(n.t===`cubesDropped`)this.event&&={...this.event,battleEarnings:n.battleEarnings},this.handlers.onCubesDropped({fromId:n.fromId,fromName:n.fromName,haulSats:n.haulSats,cubes:n.cubes??[],battleEarnings:n.battleEarnings});else if(n.t===`wrecked`)this.handlers.onWrecked(n.id,n.name);else if(n.t===`fieldReset`)this.finishSent=!1,this.handlers.onFieldReset();else if(n.t===`raceResult`)this.phase=`finished`,n.event!==void 0&&(this.event=n.event),this.handlers.onRaceResult(n.winnerId,n.winnerName,n.timeMs,n.trackOptions,n.voteEndsAt);else if(n.t===`voteUpdate`)this.handlers.onVoteUpdate(n.votes,n.received,n.total);else if(n.t===`voteResult`)this.phase=`starting`,this.handlers.onVoteResult(n.trackId);else if(n.t===`state`){let e=this.localStamp(n.at??0,t);this.emitState(n.players,e)}else if(n.t===`eventInvoice`)this.myBuyIn={paymentRequest:n.paymentRequest,bolt11:n.bolt11,amountSats:n.amountSats,buyInSats:n.buyInSats,feeSats:n.feeSats},this.event&&n.feeSats!=null&&(this.event.feeSats=n.feeSats),this.handlers.onEventInvoice(n.paymentRequest,n.amountSats,!!n.mock,n.buyInSats,n.feeSats,n.bolt11);else if(n.t===`payoutResult`)this.handlers.onPayoutResult({ok:n.ok,token:n.token,winnerSats:n.winnerSats,tipSats:n.tipSats,feeSats:n.feeSats,tipCollected:n.tipCollected,mock:n.mock,error:n.error});else if(n.t===`buyInRefund`){let e={ok:n.ok,token:n.token,sats:n.sats,mock:n.mock,error:n.error};if(this.refundWait){clearTimeout(this.refundWait.timer);let t=this.refundWait;this.refundWait=null,t.resolve(e)}this.handlers.onBuyInRefund?.(e)}else n.t===`eventUpdate`?(n.event&&(this.event=n.event),this.handlers.onEventUpdate?.(n.event)):n.t===`pong`?this.latency=Math.max(0,performance.now()-n.n):n.t===`error`&&(this.handlers.onError(n.message),this.handlers.onStatus(n.message),this.myId||this.softClose(i,r))},i.onclose=()=>{if(!(r!==this.connGen||this.ws!==i)){if(this.connected=!1,this.ws=null,!a&&n&&this.pending){this.handlers.onStatus(`Retrying via proxy…`),this.openSocket(n,this.pending,null,r);return}!this.myId&&!this.pending||(this.myId=``,this.hostId=``,this.phase=``,this.pending=null,this.handlers.onStatus(`Disconnected`))}},i.onerror=()=>{r!==this.connGen||this.ws!==i||!a&&n||this.handlers.onStatus(`Connection failed — run npm start`)}}softClose(e,t){if(t===this.connGen){this.stopPingLoop(),this.stopPosePump(),this.closePoseMesh(),this.pendingRtc.length=0,this.pendingPose=null,this.connected=!1,this.ws=null,this.pending=null,this.myId=``,this.roster.clear(),this.clockReady=!1;try{e.close()}catch{}}}disconnect(){this.connGen++,this.stopPingLoop(),this.stopPosePump(),this.closePoseMesh(),this.pendingRtc.length=0,this.pendingPose=null,this.refundWait&&=(clearTimeout(this.refundWait.timer),this.refundWait.resolve(null),null);let e=this.ws;this.ws=null,this.connected=!1,this.myId=``,this.hostId=``,this.trackId=``,this.kind=`car`,this.maxPlayers=8,this.phase=``,this.event=null,this.myBuyIn=null,this.finishSent=!1,this.pending=null,this.spectator=!1,this.spectateTargetId=``,this.roster.clear(),this.clockReady=!1,this.clockOffset=0;try{e?.close()}catch{}}get id(){return this.myId}get isHost(){return!!this.myId&&this.myId===this.hostId}startRace(){!this.ws||this.ws.readyState!==WebSocket.OPEN||!this.myId||this.ws.send(JSON.stringify({t:`start`,weather:St(this.weather)}))}reportCrash(){this.spectator||!this.ws||this.ws.readyState!==WebSocket.OPEN||!this.myId||this.phase===`racing`&&this.ws.send(JSON.stringify({t:`crash`}))}reportFinish(e,t){this.spectator||this.finishSent||!this.ws||this.ws.readyState!==WebSocket.OPEN||!this.myId||this.phase!==`racing`||(this.finishSent=!0,this.ws.send(JSON.stringify({t:`finish`,timeMs:Math.max(0,Math.round(e)),bestLapMs:Number.isFinite(t)?Math.max(0,Math.round(t)):0})))}voteForTrack(e){!this.ws||this.ws.readyState!==WebSocket.OPEN||this.phase!==`finished`||this.ws.send(JSON.stringify({t:`vote`,trackId:e}))}submitToken(e){if(!this.ws||this.ws.readyState!==WebSocket.OPEN||!this.myId)return;let t=e.trim();t&&this.ws.send(JSON.stringify({t:`submitToken`,token:t}))}pickupCube(e,t,n){if(!this.ws||this.ws.readyState!==WebSocket.OPEN||!this.myId||this.phase!==`racing`||!this.event)return;let r={t:`pickupCube`,cubeId:Math.round(e)};Number.isFinite(t)&&Number.isFinite(n)&&(r.x=+Number(t).toFixed(3),r.z=+Number(n).toFixed(3)),this.ws.send(JSON.stringify(r))}claimPot(e){!this.ws||this.ws.readyState!==WebSocket.OPEN||!this.myId||this.phase!==`finished`||!this.event||this.ws.send(JSON.stringify({t:`claimPot`,tipPercent:Math.max(0,Math.min(100,Math.round(e)))}))}leaveRoom(e=4e3){return!this.ws||this.ws.readyState!==WebSocket.OPEN||!this.myId?Promise.resolve(null):(this.refundWait&&=(clearTimeout(this.refundWait.timer),this.refundWait.resolve(null),null),new Promise(t=>{let n=setTimeout(()=>{this.refundWait?.resolve===t&&(this.refundWait=null),t(null)},Math.max(500,e));this.refundWait={resolve:t,timer:n};try{this.ws.send(JSON.stringify({t:`leave`}))}catch{clearTimeout(n),this.refundWait=null,t(null)}}))}maybeSendPose(e,t){this.spectator||!this.ws||this.ws.readyState!==WebSocket.OPEN||!this.myId||this.phase!==`racing`&&this.phase!==`finished`||(this.pendingPose=t,this.ensurePosePump(),this.flushPendingPose())}ensurePosePump(){if(this.posePumpTimer!=null)return;let e=this.connGen;this.posePumpTimer=setInterval(()=>{if(e!==this.connGen||!this.ws||this.ws.readyState!==WebSocket.OPEN){this.stopPosePump();return}this.phase!==`racing`&&this.phase!==`finished`||this.flushPendingPose()},Vs)}stopPosePump(){this.posePumpTimer!=null&&(clearInterval(this.posePumpTimer),this.posePumpTimer=null)}flushPendingPose(){let e=this.pendingPose;if(!e||!this.ws||this.ws.readyState!==WebSocket.OPEN||!this.myId)return;let t=performance.now();t-this.lastPoseAt<33.333333333333336*.9||(this.lastPoseAt=t,this.poseMesh?.sendPose({id:this.myId,x:e.x,z:e.z,h:e.h,s:e.s,g:e.g,lap:e.lap}),this.ws.send(JSON.stringify({t:`pose`,x:+e.x.toFixed(3),z:+e.z.toFixed(3),h:+e.h.toFixed(4),s:+e.s.toFixed(3),g:e.g,lap:e.lap})))}ping(){if(!this.ws||this.ws.readyState!==WebSocket.OPEN)return;let e=performance.now();this.pingAt=e,this.ws.send(JSON.stringify({t:`ping`,n:e}))}startPingLoop(e,t){this.stopPingLoop(),this.pingTimer=setInterval(()=>{if(t!==this.connGen||this.ws!==e||e.readyState!==WebSocket.OPEN){this.stopPingLoop();return}this.ping()},2e3)}stopPingLoop(){this.pingTimer&&=(clearInterval(this.pingTimer),null)}},gc=1.5,_c=1.45,vc={small:.95,medium:1.25,large:1.65},yc={small:1.55,medium:1.85,large:2.15},bc=null;function xc(){if(bc)return bc;let e=document.createElement(`canvas`);e.width=128,e.height=128;let t=e.getContext(`2d`),n=[`#ff3b2e`,`#ff9a3c`,`#ffe566`,`#3dff9a`,`#3dbbff`,`#c45cff`,`#ff3b2e`],r=128/(n.length-1);for(let e=0;e<n.length-1;e++)t.fillStyle=n[e],t.beginPath(),t.moveTo(0,e*r-8),t.lineTo(128,e*r-28),t.lineTo(128,(e+1)*r-28),t.lineTo(0,(e+1)*r-8),t.closePath(),t.fill();let i=t.createRadialGradient(128/2,128/2,18,128/2,128/2,70);i.addColorStop(0,`rgba(255,255,255,0.22)`),i.addColorStop(.55,`rgba(0,0,0,0)`),i.addColorStop(1,`rgba(0,0,0,0.35)`),t.fillStyle=i,t.fillRect(0,0,128,128),t.beginPath(),t.arc(128/2,128/2,34,0,Math.PI*2),t.fillStyle=`rgba(255,255,255,0.94)`,t.fill(),t.lineWidth=4,t.strokeStyle=`rgba(12,14,20,0.85)`,t.stroke(),t.fillStyle=`#141820`,t.font=`bold 58px Orbitron, Rajdhani, sans-serif`,t.textAlign=`center`,t.textBaseline=`middle`,t.fillText(`?`,128/2,67);let a=new D(e);return a.colorSpace=te,a.anisotropy=4,bc=a,a}function Sc(){let e=xc();return new U({map:e,color:16777215,emissive:16762967,emissiveMap:e,emissiveIntensity:.55,roughness:.28,metalness:.22})}function Cc(e,t){let n=[];for(let r of t){let t=vc[r.tier]??1,i=new V;i.position.set(r.x,t*.55+.4,r.z),i.userData.battleCubeId=r.id,i.userData.battleTier=r.tier;let a=new J(new Y(t,t,t),Sc());a.castShadow=!1,a.receiveShadow=!1,i.add(a);let o=new J(new Y(t*1.08,t*1.08,t*1.08),new ut({color:16770406,transparent:!0,opacity:.18,depthWrite:!1}));i.add(o),e.add(i),n.push({id:r.id,sats:r.sats,tier:r.tier,x:r.x,z:r.z,mesh:i,taken:!1})}return n}function wc(e,t,n,r,i,a){let o=i-n,s=a-r,c=e-n,l=t-r,u=o*o+s*s;if(u<1e-8)return c*c+l*l;let d=(c*o+l*s)/u;d<0?d=0:d>1&&(d=1);let f=n+o*d-e,p=r+s*d-t;return f*f+p*p}function Tc(e,t){for(let n of t)e.remove(n.mesh),n.mesh.traverse(e=>{let t=e;if(!t.isMesh)return;t.geometry?.dispose();let n=t.material;if(Array.isArray(n))for(let e of n)Ec(e);else n&&Ec(n)});t.length=0}function Ec(e){let t=e;t.map&&t.map===bc&&(t.map=null,t.emissiveMap=null),e.dispose()}function Dc(e,t){for(let n of e){if(n.taken)continue;let e=vc[n.tier]??1,r=yc[n.tier]??1.7;n.mesh.rotation.y=t*r+n.id*.4,n.mesh.rotation.x=Math.sin(t*2.1+n.id)*.22,n.mesh.rotation.z=Math.cos(t*1.6+n.id*.5)*.12,n.mesh.position.y=e*.55+.4+Math.sin(t*2.8+n.id*.7)*.28}}function Oc(e){if(!e||typeof e!=`object`)return!1;let t=e;return typeof t.id==`string`&&typeof t.pubkey==`string`&&typeof t.sig==`string`&&typeof t.kind==`number`&&Array.isArray(t.tags)}var kc=5,Ac=`racer-board-archive`;function jc(e){return`racer-leaderboard-v${kc}-${e}`}var Mc=`racer-driver-name`,Nc=200;function Pc(e){return String(e??``).normalize(`NFKC`).replace(/[^\p{L}\p{N} _]/gu,``).replace(/\s+/g,` `).trim().slice(0,15).trim()||`RACER`}function Fc(){return ya.map(e=>e.id)}function Ic(e){return!1}function Lc(e){let t=String(e??``).trim();return ka(t)?t:wa}var Rc=`https://jsonblob.com/api/jsonBlob/019fbe1c-6b22-7df1-9007-59a04ae0df4c`,zc=[Rc,`https://jsonblob.com/api/jsonBlob/019f89b5-c828-7f52-80b7-ca3888e5ae1b`],Bc=4,Vc=250;function Hc(e){try{let t=localStorage.getItem(jc(e));if(!t)return[];let n=JSON.parse(t);return Array.isArray(n)?n:[]}catch{return[]}}function Uc(e,t){try{localStorage.setItem(jc(e),JSON.stringify(t.slice(0,Nc)))}catch{}}var Wc=15;function Gc(e){return e.pubkey?`pk:${e.pubkey}`:`${e.name.trim().toLowerCase()}|${Math.round(e.timeMs)}`}function Kc(e,t){return e.name.trim().toLowerCase()===t.name.trim().toLowerCase()&&Math.abs(e.timeMs-t.timeMs)<=Wc}function qc(e,t){let n=Ic(e.trackId||``)||Ic(t.trackId||``),r=e,i=t;if(n){let n=e.bestLapMs??0,a=t.bestLapMs??0;n===a?e.timeMs===t.timeMs?(r=(e.at||0)<=(t.at||0)?e:t,i=r===e?t:e):(r=e.timeMs<t.timeMs?e:t,i=r===e?t:e):(r=n>a?e:t,i=r===e?t:e)}else e.pubkey&&e.pubkey===t.pubkey?(r=e.timeMs<t.timeMs||e.timeMs===t.timeMs&&(e.at||0)<=(t.at||0)?e:t,i=r===e?t:e):(r=(e.at||0)<=(t.at||0)?e:t,i=r===e?t:e);return r.bestLapMs==null&&i.bestLapMs!=null?{...r,bestLapMs:i.bestLapMs}:r}function Jc(e,t){let n=t?Lc(t):void 0,r=[...e].filter(e=>e&&typeof e.timeMs==`number`&&Number.isFinite(e.timeMs)&&e.timeMs>0).map(e=>({name:Pc(String(e.name||`RACER`)),timeMs:Math.round(e.timeMs),bestLapMs:e.bestLapMs==null?void 0:Math.round(e.bestLapMs),at:e.at||Date.now(),trackId:n??(e.trackId?Lc(e.trackId):void 0),pubkey:e.pubkey,eventId:e.eventId})),i=new Map;for(let e of r){let t=Gc(e),n=i.get(t);i.set(t,n?qc(n,e):e)}let a=[];for(let e of i.values()){let t=a.find(t=>Kc(t,e));if(t){let n=a.indexOf(t);a[n]=qc(t,e)}else a.push(e)}return a.sort((e,t)=>{if(n&&Ic(n)){let n=e.bestLapMs??0;return(t.bestLapMs??0)-n||e.timeMs-t.timeMs||(e.at||0)-(t.at||0)}return e.timeMs-t.timeMs||(e.at||0)-(t.at||0)}).slice(0,Nc)}function Yc(){let e={};for(let t of Fc())e[t]=[];return e}function Xc(...e){let t=Yc();for(let n of Fc()){let r=[];for(let t of e){let e=t?.[n];Array.isArray(e)&&e.length&&r.push(...e)}t[n]=Jc(r,n)}return t}function Zc(e){if(!e||typeof e!=`object`)return!1;if(Array.isArray(e))return!0;let t=e;return t.error!=null&&t.byTrack==null&&t.entries==null?!1:!!(t.byTrack&&typeof t.byTrack==`object`||Array.isArray(t.entries))}function Qc(e,t,n,r=!1){if(Oc(e)){let n=g(e,t);return n?{name:n.name,timeMs:n.timeMs,bestLapMs:n.bestLapMs,at:n.at,trackId:n.trackId,pubkey:n.pubkey,eventId:n.eventId}:null}if(!r||!e||typeof e!=`object`)return null;let i=e;if(typeof i.timeMs!=`number`||!Number.isFinite(i.timeMs)||i.timeMs<=0)return null;let a=typeof i.pubkey==`string`&&/^[0-9a-f]{64}$/.test(i.pubkey)?i.pubkey.toLowerCase():void 0;return{name:typeof i.name==`string`?i.name:`RACER`,timeMs:i.timeMs,bestLapMs:i.bestLapMs!=null&&Number.isFinite(i.bestLapMs)&&i.bestLapMs>0?i.bestLapMs:void 0,at:typeof i.at==`number`&&Number.isFinite(i.at)?i.at:Date.now(),trackId:i.trackId?Lc(i.trackId):t,pubkey:a,eventId:typeof i.eventId==`string`?i.eventId:void 0}}function $c(e,t=!1,n=t){let r=Yc();if(!Zc(e))return r;let i=e,a=(e,r)=>e.map(e=>Qc(e,r,t,n)).filter(e=>e!==null);if(i.byTrack&&typeof i.byTrack==`object`){for(let[e,t]of Object.entries(i.byTrack)){let n=Lc(e);Array.isArray(t)&&(r[n]=Jc([...r[n]??[],...a(t,n)],n))}return r}return Array.isArray(e)?(r[wa]=Jc(a(e,wa),wa),r):(Array.isArray(i.entries)&&(r[wa]=Jc(a(i.entries,wa),wa)),r)}function el(e,t){let n=Lc(t);return Jc(e[n]??[],n)}function tl(){let e=Yc();for(let t of Fc())e[t]=Jc(Hc(t),t);return e}function nl(e){for(let t of Fc())Uc(t,Jc(e[t]??[],t))}function rl(e){let t=/^racer-leaderboard-v\d+-(.+)$/.exec(e);return t?Lc(t[1]):/^racer-leaderboard-v\d+$/.test(e)?wa:null}function il(e,t){let n=Yc(),r=Lc(e);return n[r]=t.map(e=>Qc(e,r,!0,!0)).filter(e=>e!==null),n}function al(){let e=[tl()];try{let t=localStorage.getItem(Ac);t&&e.push($c(JSON.parse(t),!0,!0));let n=[];for(let e=0;e<localStorage.length;e++){let t=localStorage.key(e);t&&n.push(t)}for(let t of n){if(!t.startsWith(`racer-leaderboard-v`)||t.startsWith(`racer-leaderboard-v${kc}-`))continue;let n=rl(t);if(!n)continue;let r=localStorage.getItem(t);if(!r)continue;let i=JSON.parse(r);Array.isArray(i)?e.push(il(n,i)):e.push($c(i,!0,!0))}}catch{}return Xc(...e)}function ol(e){let t=Xc(e);nl(t);try{localStorage.setItem(Ac,JSON.stringify({byTrack:t}));for(let e of Fc())localStorage.setItem(`racer-leaderboard-v4-${e}`,JSON.stringify(t[e]??[]))}catch{}}function sl(e){return new Promise(t=>setTimeout(t,e))}function cl(e){return e===429||e===408||e>=500}async function ll(e,t){let n;for(let r=0;r<Bc;r++)try{let n=await fetch(e,{cache:`no-store`,...t,headers:{Accept:`application/json`,...t?.headers??{}}});if(cl(n.status)&&r<Bc-1){await sl(Vc*2**r);continue}return n}catch(e){if(n=e,r<Bc-1){await sl(Vc*2**r);continue}}throw n instanceof Error?n:Error(`blob fetch failed`)}function ul(e){return ll(Rc,e)}async function dl(){let e=f(`/leaderboard`);if(!e)return null;try{let t=await fetch(e,{cache:`no-store`});if(!t.ok)return null;let n=await t.json();return Zc(n)?$c(n,!0):null}catch{return null}}async function fl(e=Rc){let t=await ll(e);if(!t.ok)throw Error(String(t.status));let n=await t.json();if(!Zc(n))throw Error(`unrecognized board payload`);return $c(n,!1,!0)}async function pl(){return Xc(...(await Promise.all(zc.map(async e=>{try{return await fl(e)}catch{return null}}))).filter(e=>e!==null))}function ml(e){let t={},n=e,r={};if(n&&typeof n==`object`&&n.byTrack&&typeof n.byTrack==`object`)for(let[e,t]of Object.entries(n.byTrack))Array.isArray(t)&&(r[Lc(e)]=t);else Array.isArray(e)&&(r[wa]=e);for(let[e,n]of Object.entries(r))t[e]=n.filter(Oc);return t}async function hl(e,t){let n=Lc(t),r={},i=Yc();try{let e=await ul();if(e.ok){let t=await e.json();r=ml(t),i=$c(t,!1,!0)}}catch{}let a={};for(let t of Fc()){let o=[...r[t]??[],...t===n?[e]:[]],s=new Map;for(let e of o){let n=g(e,t);if(!n)continue;let r=s.get(n.pubkey),i=n.bestLapMs??0;(Ic(t)?!r||i>r.score||i===r.score&&n.timeMs<r.timeMs:!r||n.timeMs<r.timeMs||n.timeMs===r.timeMs&&n.at<r.at)&&s.set(n.pubkey,{raw:e,timeMs:n.timeMs,at:n.at,score:i})}let c=[...s.values()].sort((e,n)=>Ic(t)?n.score-e.score||e.timeMs-n.timeMs:e.timeMs-n.timeMs||e.at-n.at).map(e=>e.raw),l=new Set(s.keys()),u=(i[t]??[]).filter(e=>!e.pubkey||!l.has(e.pubkey));a[t]=[...c,...u].slice(0,Nc)}let o=await ul({method:`PUT`,headers:{"Content-Type":`application/json`},body:JSON.stringify({byTrack:a})});if(!o.ok)throw Error(String(o.status))}function gl(e,t,n){let r=Lc(n),i=Xc(e);return i[r]=Jc([...i[r]??[],t],r),i}function _l(e){return e?Fc().some(t=>(e[t]??[]).length>0):!1}async function vl(e=wa){let t=Lc(e),n=al(),r=await dl();r&&yl(r).catch(()=>void 0);let i=await pl(),a=Xc(n,r??Yc(),i);ol(a);let o=_l(r)?`server`:_l(i)?`online`:`local`;return{entries:el(a,t),source:o}}async function yl(e){let t=f(`/leaderboard`);if(!t)return;let n;try{let e=await ul();if(!e.ok)return;n=ml(await e.json())}catch{return}for(let r of Fc()){let i=new Map((e[r]??[]).map(e=>[e.pubkey,e]));for(let e of n[r]??[]){let n=g(e,r);if(!n)continue;let a=n.pubkey?i.get(n.pubkey):void 0;if(!(a&&(!(Ic(r)?(n.bestLapMs??0)>(a.bestLapMs??0):a.timeMs<=n.timeMs)&&Ic(r)||!Ic(r)&&a.timeMs<=n.timeMs)))try{await fetch(t,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({event:e})})}catch{}}}}async function bl(e,t=wa,n){let{entries:r}=await vl(t);return r.length<Nc?!0:Ic(t)&&n!=null?n>(r[r.length-1].bestLapMs??0):e<r[r.length-1].timeMs}async function xl(e,t,n,r=wa,i){let a=Lc(r),o={name:Pc(e),timeMs:Math.round(t),bestLapMs:n!=null&&Number.isFinite(n)?Math.round(n):void 0,at:Date.now(),trackId:a},s=gl(tl(),o,a);if(nl(s),!i)return ol(s),{entries:el(s,a),source:`local`};let c=await i.signEvent(h({name:o.name,timeMs:o.timeMs,bestLapMs:o.bestLapMs,trackId:a})),l=f(`/leaderboard`);if(l)try{let e=await fetch(l,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({event:c})});if(e.ok){let t=await e.json();if(Zc(t)){let e=Xc($c(t,!0,!0),al());return ol(e),hl(c,a).catch(()=>void 0),m(c),{entries:el(e,a),source:`server`}}}}catch{}try{await hl(c,a),m(c);let e=Xc(await fl(),al());return ol(e),{entries:el(e,a),source:`online`}}catch{return ol(s),{entries:el(s,a),source:`local`}}}function Sl(e){if(!Number.isFinite(e)||e<0)return`--:--.---`;let t=Math.floor(e),n=Math.floor(t/6e4),r=Math.floor(t%6e4/1e3),i=t%1e3;return`${n}:${r.toString().padStart(2,`0`)}.${i.toString().padStart(3,`0`)}`}function Cl(e,t=!1){return e===`server`?t?`Saved to Sats Racer board`:`Live Sats Racer board`:e===`online`?t?`Saved to worldwide board`:`Live worldwide board`:t?`Saved locally · offline`:`Local board · offline`}function wl(e){try{localStorage.setItem(Mc,Pc(e))}catch{}}function Tl(){try{let e=localStorage.getItem(Mc);return e&&Pc(e)||null}catch{return null}}ol(al());var El=30078,Dl=`racer-online:dev`;async function Ol(){let e=f(`/status`);if(!e)return null;try{let t=await fetch(e,{signal:AbortSignal.timeout(6e3)});if(!t.ok)return null;let n=await t.json(),r=String(n?.devPubkey||``).toLowerCase();return/^[0-9a-f]{64}$/.test(r)?r:null}catch{return null}}function kl(){return{kind:El,created_at:Math.floor(Date.now()/1e3),content:JSON.stringify({action:`dev-tips`,at:Date.now()}),tags:[[`d`,Dl],[`t`,`racer-online`]]}}async function Al(e){return e.signEvent(kl())}async function jl(e,t,n){let r=f(e);if(!r)throw Error(`server unreachable`);let i=await t.signEvent(kl()),a=await fetch(r,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({event:i,...n})}),o=await a.json().catch(()=>({}));if(!a.ok||o?.ok!==!0)throw Error(String(o?.error||`server ${a.status}`));return o}function Ml(e){return jl(`/dev/tips`,e)}function Nl(e,t){return jl(`/dev/claim`,e)}function Pl(e,t){return jl(`/dev/claim`,e,{retryAt:t})}function Fl(e,t){return jl(`/dev/withdraw`,e,t==null?{}:{amountSats:t})}async function Il(e,t,n){let r=f(`/dev/feedback`);if(!r)throw Error(`server unreachable`);let i=await e.signEvent(kl()),a=await fetch(r,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({event:i,action:t,id:n})}),o=await a.json().catch(()=>({}));if(!a.ok||o?.ok!==!0||!Array.isArray(o?.messages))throw Error(String(o?.error||`server ${a.status}`));return o.messages}function Ll(e){return Il(e,`list`)}function Rl(e,t){return Il(e,`read`,t)}function zl(e,t){return Il(e,`delete`,t)}var Bl=.28,Vl=.55,Hl=.72,Ul=.38,Wl=.36,Gl=`racer-online-muted`,Kl=class{ctx=null;output=null;master=null;musicGain=null;unlocked=!1;muted=!0;userMuted=!1;volumeScale=1;menuBuffer=null;explodeBuffer=null;menuSource=null;musicMode=`off`;wantedMusic=`off`;loadPromise=null;musicSeq=0;engineKind=null;engineGain=null;engineFilter=null;engineOscA=null;engineOscB=null;engineOscC=null;engineNoise=null;engineNoiseGain=null;engineNoiseFilter=null;lastGear=null;noiseBuf=null;constructor(){try{this.userMuted=localStorage.getItem(Gl)!==`0`}catch{this.userMuted=!0}}get isUserMuted(){return this.userMuted}setUserMuted(e){this.userMuted=e;try{localStorage.setItem(Gl,e?`1`:`0`)}catch{}this.applyUserMuteGain()}setMasterVolume(e){if(this.volumeScale=Math.max(0,Math.min(1,Number.isFinite(e)?e:1)),this.applyUserMuteGain(),!this.muted&&this.master&&this.ctx){let e=this.ctx.currentTime;this.master.gain.cancelScheduledValues(e),this.master.gain.setValueAtTime(Vl*this.volumeScale,e)}}toggleUserMute(){return this.setUserMuted(!this.userMuted),this.userMuted}async unlock(){let e=this.ensureContext();if(e.state===`suspended`)try{await e.resume()}catch{}this.unlocked=e.state===`running`,this.unlocked&&this.ensureTracksLoaded()}mute(){this.muted=!0,this.setMasterGain(0,.08),this.stopDriveEngine()}unmute(){if(this.muted=!1,!this.unlocked||!this.master||!this.ctx)return;let e=this.ctx.currentTime;this.master.gain.cancelScheduledValues(e),this.master.gain.setValueAtTime(Vl*this.volumeScale,e)}playMenuMusic(){this.setMusic(`menu`)}stopMenuMusic(){(this.wantedMusic===`menu`||this.musicMode===`menu`)&&this.setMusic(`off`)}playDriveMusic(){this.stopMenuMusic()}stopDriveMusic(){}stopMusic(){this.setMusic(`off`)}stopRaceAudio(){this.stopDriveEngine()}updateBikeEngine(e,t){this.updateDriveEngine(`bike`,e,t,1)}stopBikeEngine(){this.stopDriveEngine()}updateDriveEngine(e,t,n,r){if(!this.ready||!this.ctx||!this.master){this.stopDriveEngine();return}if(this.stopMenuMusic(),this.lastGear!=null&&r!==this.lastGear&&r!==`N`&&this.playGearShift(e),this.lastGear=r,(!this.engineGain||this.engineKind!==e)&&(this.startDriveEngine(e),!this.engineGain))return;let i=Math.max(0,t)*3.6,a=Math.max(0,Math.min(1,n)),o=r===`N`||r===`R`?r===`R`?Xe.R.max*3.6:40:Xe[r].max*3.6,s=Math.max(0,Math.min(1.05,i/Math.max(8,o))),c=(i<2)*.22+s*.78+a*.12,l=this.ctx.currentTime,u=e===`bike`,d=(u?88:48)+c*(u?210:145),f=d*(u?2.05:1.55),p=d*(u?3.1:2.35);this.engineOscA?.frequency.setTargetAtTime(d,l,.05),this.engineOscB?.frequency.setTargetAtTime(f,l,.05),this.engineOscC?.frequency.setTargetAtTime(p,l,.06);let m=(u?900:520)+c*(u?2800:1600)+a*400;this.engineFilter?.frequency.setTargetAtTime(m,l,.07),this.engineNoiseFilter?.frequency.setTargetAtTime((u?1400:700)+c*(u?2200:1100),l,.08);let h=(u?Wl:Ul)*(.14+Math.min(1,i/160)*.55+a*.28+(r===`N`?.08:0));this.engineGain.gain.setTargetAtTime(Math.max(1e-4,h),l,.06),this.engineNoiseGain&&this.engineNoiseGain.gain.setTargetAtTime(Math.max(1e-4,h*(u?.22:.35)*(.35+a*.65)),l,.08)}stopDriveEngine(){for(let e of[this.engineOscA,this.engineOscB,this.engineOscC])if(e){try{e.stop()}catch{}try{e.disconnect()}catch{}}if(this.engineOscA=null,this.engineOscB=null,this.engineOscC=null,this.engineNoise){try{this.engineNoise.stop()}catch{}try{this.engineNoise.disconnect()}catch{}this.engineNoise=null}for(let e of[this.engineNoiseGain,this.engineNoiseFilter,this.engineFilter,this.engineGain])if(e)try{e.disconnect()}catch{}this.engineNoiseGain=null,this.engineNoiseFilter=null,this.engineFilter=null,this.engineGain=null,this.engineKind=null,this.lastGear=null}startDriveEngine(e){if(!this.ready||!this.ctx||!this.master)return;this.stopDriveEngine();let t=this.ctx,n=t.createGain();n.gain.value=1e-4,n.connect(this.master);let r=t.createBiquadFilter();r.type=`lowpass`,r.Q.value=e===`bike`?.9:1.2,r.frequency.value=e===`bike`?1200:600,r.connect(n);let i=(n,i)=>{let a=t.createOscillator();a.type=n,a.detune.value=i,a.frequency.value=e===`bike`?90:50;let o=t.createGain();return o.gain.value=n===`sawtooth`?.28:n===`square`?.12:.18,a.connect(o),o.connect(r),a.start(),a};this.engineOscA=i(`sawtooth`,0),this.engineOscB=i(e===`bike`?`square`:`triangle`,7),this.engineOscC=i(e===`bike`?`sawtooth`:`sine`,-11);let a=t.createBiquadFilter();a.type=`bandpass`,a.frequency.value=e===`bike`?1600:800,a.Q.value=.7;let o=t.createGain();o.gain.value=1e-4,a.connect(o),o.connect(n);let s=t.createBufferSource();s.buffer=this.ensureNoiseBuffer(1.2),s.loop=!0,s.connect(a),s.start(),this.engineNoise=s,this.engineNoiseFilter=a,this.engineNoiseGain=o,this.engineFilter=r,this.engineGain=n,this.engineKind=e}playGearShift(e=`car`){if(!this.ready||!this.ctx||!this.master)return;let t=this.ctx,n=t.currentTime,r=e===`bike`,i=t.createBufferSource();i.buffer=this.ensureNoiseBuffer(.08);let a=t.createBiquadFilter();a.type=`bandpass`,a.frequency.value=r?2400:900,a.Q.value=1.4;let o=t.createGain();o.gain.setValueAtTime(1e-4,n),o.gain.exponentialRampToValueAtTime(r?.22:.28,n+.004),o.gain.exponentialRampToValueAtTime(1e-4,n+(r?.07:.09)),i.connect(a),a.connect(o),o.connect(this.master),i.start(n),i.stop(n+.12);let s=(e,n,r,i)=>{let a=t.createOscillator(),o=t.createGain();a.type=`square`,a.frequency.setValueAtTime(e,n),a.frequency.exponentialRampToValueAtTime(e*.55,n+i),o.gain.setValueAtTime(1e-4,n),o.gain.exponentialRampToValueAtTime(r,n+.003),o.gain.exponentialRampToValueAtTime(1e-4,n+i),a.connect(o),o.connect(this.master),a.start(n),a.stop(n+i+.02)};s(r?520:180,n+.02,r?.14:.18,.05),s(r?780:260,n+.035,r?.1:.12,.04)}playCountdown(e){if(!this.ready)return;let t=this.ctx,n=t.currentTime,r=e===`GO`,i=r?1046.5:659.25,a=r?.48:.11,o=t.createOscillator(),s=t.createGain();if(o.type=`square`,o.frequency.setValueAtTime(i,n),s.gain.setValueAtTime(1e-4,n),s.gain.exponentialRampToValueAtTime(r?.2:.18,n+.008),r&&s.gain.setValueAtTime(.2,n+.28),s.gain.exponentialRampToValueAtTime(1e-4,n+a),o.connect(s),s.connect(this.master),o.start(n),o.stop(n+a+.02),r){let e=t.createOscillator(),r=t.createGain();e.type=`square`,e.frequency.setValueAtTime(i*1.5,n),r.gain.setValueAtTime(1e-4,n),r.gain.exponentialRampToValueAtTime(.12,n+.01),r.gain.setValueAtTime(.12,n+.28),r.gain.exponentialRampToValueAtTime(1e-4,n+a),e.connect(r),r.connect(this.master),e.start(n),e.stop(n+a+.02)}}playBoom(){if(!this.ready)return;let e=this.ctx,t=e.currentTime,n=e.createOscillator(),r=e.createGain(),i=e.createBiquadFilter();n.type=`sine`,n.frequency.setValueAtTime(90,t),n.frequency.exponentialRampToValueAtTime(28,t+.45),i.type=`lowpass`,i.frequency.setValueAtTime(280,t),i.frequency.exponentialRampToValueAtTime(80,t+.4),r.gain.setValueAtTime(1e-4,t),r.gain.exponentialRampToValueAtTime(.38,t+.012),r.gain.exponentialRampToValueAtTime(1e-4,t+.42),n.connect(i),i.connect(r),r.connect(this.master),n.start(t),n.stop(t+.45),this.playNoiseBurst(.22,.32,1200),this.playNoiseBurst(.12,.2,380)}playExplode(){if(!this.ready)return;if(!this.explodeBuffer){this.playBoom();return}let e=this.ctx,t=e.currentTime,n=e.createBufferSource();n.buffer=this.explodeBuffer;let r=e.createGain();r.gain.setValueAtTime(Hl,t),n.connect(r),r.connect(this.master),n.start(t)}get ready(){return this.unlocked&&!this.muted&&!!this.ctx&&!!this.master}applyUserMuteGain(){if(!this.output||!this.ctx)return;let e=this.ctx.currentTime;this.output.gain.cancelScheduledValues(e),this.output.gain.setValueAtTime(this.userMuted?0:this.volumeScale,e)}async setMusic(e){this.wantedMusic=e;let t=++this.musicSeq;if(this.ensureContext(),this.ctx.state===`suspended`)try{await this.ctx.resume()}catch{return}if(this.unlocked=this.ctx.state===`running`,!this.unlocked||(await this.ensureTracksLoaded(),t!==this.musicSeq||this.wantedMusic!==e)||e===this.musicMode&&(e===`menu`&&this.menuSource||e===`off`)||(this.stopMusicSources(),this.musicMode=e,e===`off`||!this.musicGain))return;let n=this.menuBuffer;if(!n)return;let r=this.ctx.createBufferSource();r.buffer=n,r.loop=!0,r.connect(this.musicGain);let i=this.ctx.currentTime;this.musicGain.gain.cancelScheduledValues(i),this.musicGain.gain.setValueAtTime(1e-4,i),this.musicGain.gain.exponentialRampToValueAtTime(Bl,i+.12),r.start(0),this.menuSource=r}stopMusicSources(){if(this.menuSource){try{this.menuSource.stop()}catch{}try{this.menuSource.disconnect()}catch{}}if(this.menuSource=null,this.musicMode=`off`,this.musicGain&&this.ctx){let e=this.ctx.currentTime;this.musicGain.gain.cancelScheduledValues(e),this.musicGain.gain.setValueAtTime(0,e)}}ensureTracksLoaded(){return this.loadPromise||=this.loadTracks().catch(e=>{this.loadPromise=null,console.warn(`Failed to load audio tracks`,e)}),this.loadPromise}async loadTracks(){let e=`/racer-online/`,[t,n]=await Promise.all([this.fetchBuffer(`${e}audio/menu.mp3`),this.fetchBuffer(`${e}audio/explode.mp3`).catch(e=>(console.warn(`Failed to load explode SFX`,e),null))]);this.menuBuffer=t,this.explodeBuffer=n}async fetchBuffer(e){let t=this.ensureContext(),n=await fetch(e);if(!n.ok)throw Error(`Audio fetch failed: ${e} (${n.status})`);let r=await n.arrayBuffer();return t.decodeAudioData(r.slice(0))}ensureContext(){if(!this.ctx){let e=window.AudioContext||window.webkitAudioContext;this.ctx=new e,this.output=this.ctx.createGain(),this.output.gain.value=+!this.userMuted,this.output.connect(this.ctx.destination),this.master=this.ctx.createGain(),this.master.gain.value=0,this.master.connect(this.output),this.musicGain=this.ctx.createGain(),this.musicGain.gain.value=0,this.musicGain.connect(this.output)}return this.ctx}setMasterGain(e,t){!this.master||!this.ctx||this.master.gain.setTargetAtTime(e,this.ctx.currentTime,t)}ensureNoiseBuffer(e){if(this.noiseBuf&&this.noiseBuf.duration>=e-.01)return this.noiseBuf;let t=this.ctx,n=Math.floor(t.sampleRate*e),r=t.createBuffer(1,n,t.sampleRate),i=r.getChannelData(0);for(let e=0;e<n;e++)i[e]=Math.random()*2-1;return this.noiseBuf=r,r}playNoiseBurst(e,t,n){if(!this.ctx||!this.master)return;let r=this.ctx,i=r.currentTime,a=r.createBufferSource();a.buffer=this.ensureNoiseBuffer(.12);let o=r.createBiquadFilter();o.type=`lowpass`,o.frequency.value=n;let s=r.createGain();s.gain.setValueAtTime(1e-4,i),s.gain.exponentialRampToValueAtTime(t,i+.005),s.gain.exponentialRampToValueAtTime(1e-4,i+e),a.connect(o),o.connect(s),s.connect(this.master),a.start(i),a.stop(i+e+.02)}},ql=`racer-garage-v1`,Jl=[15002354,13160668,9081763,1711912,791064,1185308,16726830,14826286,16738885,16739229,11816447,2778864,54527,1949546,15777824,16251644,6056826,4015700,9117210,671098,678970,8014336,4856426,1718858],Yl={kind:`car`,primary:15002354,accent:16726830};function Xl(e){return Number.isFinite(e)?Math.round(e)&16777215:Yl.primary}function Zl(e){let t=String(e??``).toLowerCase();return t===`bike`||t===`bird`?t:`car`}function Ql(e){return e===`bird`}function $l(){try{let e=localStorage.getItem(ql);if(!e)return{...Yl};let t=JSON.parse(e);return{kind:Zl(t.kind),primary:Xl(Number(t.primary)),accent:Xl(Number(t.accent??Yl.accent))}}catch{return{...Yl}}}function eu(e){let t={kind:Zl(e.kind),primary:Xl(e.primary),accent:Xl(e.accent)};try{localStorage.setItem(ql,JSON.stringify(t))}catch{}return t}function tu(e){return`#${Xl(e).toString(16).padStart(6,`0`)}`}function nu(e,t){let n=/^#?([0-9a-fA-F]{6})$/.exec(String(e||``).trim());return n?parseInt(n[1],16):Xl(t)}var ru=`meadow-sweep`,iu=`summit-pass`,au=`oval-circuit`,ou=`forest-loop`,su=`harbor-circuit`,cu=`canyon-cut`,lu=15,uu=2.8499999999999996*1.4,du=2.25*1.55,fu=.34,pu=4,mu=1.05,hu=1.15,gu=1.85,_u=1.45,vu=4,yu=8,bu=3,xu=.28,Su=-Math.PI/2,Cu=1.6,wu=14,Tu=7.2,Eu=34,Du=26,Ou=28,ku=8.2,Au=38;function ju(e,t){let n=Math.imul(e|0,374761393)^Math.imul(t|0,668265263);return n=Math.imul(n^n>>>13,1274126177),((n^n>>>16)>>>0)/4294967296}function Mu(e){return new U({color:e,roughness:.92,metalness:.02,flatShading:!0})}function Nu(e,t,n){return new U({color:e,emissive:t,emissiveIntensity:n,roughness:.86,metalness:.02,flatShading:!0})}function $(e,t,n,r,i,a,o,s){let c=new J(new Y(t,n,r),i);return c.position.set(a,o,s),c.castShadow=!1,c.receiveShadow=!1,e.add(c),c}function Pu(e){let t=new V,n=e%3!=1,r=Mu(n?15724520:6965810),i=Mu(2892828),a=Mu(13934736),o=Mu(1710102);$(t,1.35,.72,.7,r,0,.78,0),n&&($(t,.42,.5,.72,i,-.28,.82,0),$(t,.32,.38,.72,i,.38,.86,0)),$(t,.48,.42,.42,r,.82,1.05,0),$(t,.28,.22,.28,a,1.12,.92,0),$(t,.12,.18,.08,r,.72,1.28,.22),$(t,.12,.18,.08,r,.72,1.28,-.22);for(let[e,n]of[[.42,.22],[.42,-.22],[-.42,.22],[-.42,-.22]])$(t,.14,.52,.14,r,e,.28,n),$(t,.16,.1,.16,o,e,.05,n);return $(t,.5,.08,.08,i,-.85,.95,0),t.rotation.order=`YXZ`,t}function Fu(e){let t=new V,n=e%3==0?13157564:e%3==1?9078400:7033668,r=e%3==1?14210252:15262940,i=Mu(n),a=Mu(r),o=Mu(14274496),s=Mu(2761760),c=Mu(12103844);$(t,1.05,.58,.52,i,0,.72,0),$(t,.7,.28,.48,a,.05,.52,0),$(t,.28,.32,.28,i,.58,.95,0),$(t,.38,.34,.34,c,.82,1.08,0),$(t,.22,.16,.22,a,1.05,.96,0),$(t,.1,.14,.06,i,.72,1.28,.16),$(t,.1,.14,.06,i,.72,1.28,-.16);for(let e of[.12,-.12])$(t,.08,.22,.08,o,.78,1.38,e),$(t,.07,.16,.07,o,.72,1.52,e*1.15);for(let[e,n]of[[.34,.16],[.34,-.16],[-.34,.16],[-.34,-.16]])$(t,.12,.46,.12,i,e,.26,n),$(t,.14,.08,.14,s,e,.04,n);return $(t,.18,.12,.1,i,-.58,.78,0),t.rotation.order=`YXZ`,t}function Iu(e){let t=new V,n=Nu(2894896,1052696,.08),r=Nu(15262940,13157564,.22),i=Nu(16052974,15262940,.28),a=e%2==0?Nu(3824210,1716264,.12):Nu(4868698,2105392,.1),o=Mu(13928506),s=Nu(16775400,16771232,.35),c=Mu(13138024);$(t,.72,.38,.42,n,0,.36,0),$(t,.5,.2,.36,r,.04,.24,0),$(t,.32,.28,.28,a,.42,.5,0),$(t,.28,.24,.24,n,.62,.56,0),$(t,.16,.1,.1,o,.82,.52,0),$(t,.07,.07,.07,s,.66,.64,.1),$(t,.07,.07,.07,s,.66,.64,-.1),$(t,.36,.08,.24,n,-.48,.36,0),$(t,.18,.06,.2,r,-.42,.3,0),$(t,.05,.2,.05,c,.06,.1,.09),$(t,.05,.2,.05,c,.06,.1,-.09);let l=new V;l.name=`wing`,$(l,.5,.06,.32,n,0,0,.2),$(l,.36,.05,.14,i,-.02,.02,.26),l.position.set(0,.4,0),t.add(l);let u=new V;return u.name=`wing`,$(u,.5,.06,.32,n,0,0,-.2),$(u,.36,.05,.14,i,-.02,.02,-.26),u.position.set(0,.4,0),t.add(u),t.userData.wings=[l,u],t.rotation.order=`YXZ`,t}function Lu(e){let t=new V,n=Mu(e%3==0?9069112:e%3==1?7227948:10516552),r=Mu(13943976),i=Mu(13154456),a=Mu(2760728),o=Mu(3813416);$(t,1.15,.55,.48,n,0,.95,0),$(t,.75,.28,.42,r,.05,.78,0),$(t,.22,.42,.22,n,.62,1.2,0),$(t,.36,.32,.32,n,.88,1.38,0),$(t,.18,.12,.16,o,1.12,1.3,0),$(t,.08,.14,.05,n,.78,1.55,.14),$(t,.08,.14,.05,n,.78,1.55,-.14);for(let e of[.14,-.14])$(t,.12,.7,.12,i,.78,1.9,e),$(t,.42,.1,.1,i,.92,2.18,e*1.6),$(t,.1,.28,.1,i,1.08,2.32,e*1.85);for(let[e,r]of[[.36,.14],[.36,-.14],[-.38,.14],[-.38,-.14]])$(t,.1,.72,.1,n,e,.38,r),$(t,.12,.08,.12,a,e,.04,r);return $(t,.28,.1,.08,n,-.68,1.02,0),t.rotation.order=`YXZ`,t}function Ru(e){let t=new V,n=Mu(e%3==0?12868142:e%3==1?11028520:13924416),r=Mu(e%2==0?11554856:9059360),i=Mu(1710102),a=Mu(9060400);$(t,.55,.18,.42,n,0,.16,0),$(t,.4,.1,.32,n,.02,.26,0),$(t,.22,.1,.14,r,.38,.18,.22),$(t,.16,.12,.16,r,.52,.2,.24),$(t,.22,.1,.14,r,.38,.18,-.22),$(t,.16,.12,.16,r,.52,.2,-.24),$(t,.06,.08,.06,i,.22,.3,.1),$(t,.06,.08,.06,i,.22,.3,-.1);for(let[e,n]of[[-.08,.28],[.08,.3],[-.08,-.28],[.08,-.3],[-.22,.18],[-.22,-.18]])$(t,.06,.08,.18,a,e,.06,n);return t.rotation.order=`YXZ`,t}function zu(e){let t=new V,n=e%3==0?9075272:e%3==1?6969912:10522712,r=e%3==0?4866096:e%3==1?3813408:5916720,i=Mu(n),a=Mu(r),o=Mu(13154440),s=Mu(1710096),c=Mu(12599360),l=[];for(let e of[{x:1.05,w:.28,h:.16,d:.22,band:!1},{x:.82,w:.22,h:.14,d:.18,band:!0},{x:.6,w:.24,h:.15,d:.2,band:!1},{x:.38,w:.22,h:.14,d:.18,band:!0},{x:.16,w:.22,h:.14,d:.18,band:!1},{x:-.06,w:.2,h:.13,d:.16,band:!0},{x:-.28,w:.19,h:.125,d:.15,band:!1},{x:-.48,w:.17,h:.115,d:.14,band:!0},{x:-.66,w:.14,h:.1,d:.12,band:!1},{x:-.82,w:.11,h:.085,d:.1,band:!0},{x:-.95,w:.08,h:.07,d:.08,band:!1}]){let n=new V,r=e.h*.5+.02;n.position.set(e.x,r,0),n.userData.baseY=r,$(n,e.w,e.h,e.d,e.band?a:i,0,0,0),$(n,e.w*.7,e.h*.35,e.d*.85,o,0,-e.h*.28,0),t.add(n),l.push(n)}let u=l[0];return $(u,.04,.04,.04,s,.08,.06,.1),$(u,.04,.04,.04,s,.08,.06,-.1),$(u,.12,.03,.03,c,.2,-.02,0),$(u,.06,.02,.02,c,.28,-.02,.03),$(u,.06,.02,.02,c,.28,-.02,-.03),t.userData.segments=l,t.rotation.order=`YXZ`,t}var Bu=[{trackId:ru,habitat:`infield`,groupName:`meadow-cows`,hitName:`COW`,createMesh:Pu,burstColors:[16738862,16762967,16726830,16772778,8947848,15724520]},{trackId:iu,habitat:`outfield`,groupName:`summit-goats`,hitName:`GOAT`,createMesh:Fu,burstColors:[16738862,16762967,16726830,16772778,10131088,13157564]},{trackId:au,habitat:`outfield`,groupName:`city-pigeons`,hitName:`PIGEON`,createMesh:Iu,burstColors:[16738862,16762967,16726830,16772778,2894896,16052974,15262940],aerial:!0,hitDist:du,wanderSpeed:1.85,approachSpeed:3.2,crossSpeed:3.8,outfieldFar:Du},{trackId:ou,habitat:`outfield`,groupName:`forest-deer`,hitName:`DEER`,createMesh:Lu,burstColors:[16738862,16762967,16726830,16772778,9069112,13943976],wanderSpeed:1.35,approachSpeed:1.7,crossSpeed:2.2},{trackId:su,habitat:`outfield`,groupName:`harbor-crabs`,hitName:`CRAB`,createMesh:Ru,burstColors:[16738862,16762967,16726830,16772778,12868142,13924416],hitDist:du,wanderSpeed:.85,approachSpeed:1.15,crossSpeed:1.45,outfieldFar:Ou},{trackId:cu,habitat:`outfield`,groupName:`canyon-snakes`,hitName:`SNAKE`,createMesh:zu,burstColors:[16738862,16762967,16726830,16772778,9075272,13154440],slither:!0,hitDist:du,wanderSpeed:.95,approachSpeed:1.25,crossSpeed:1.65,outfieldNear:ku,outfieldFar:Au}];function Vu(e){let t=[];for(let n=0;n<640;n++)t.push(e.getPointAt(n/640));let n=new Map;for(let e=0;e<640;e++){let r=t[e],i=`${Math.floor(r.x/16)},${Math.floor(r.z/16)}`,a=n.get(i);a||(a=[],n.set(i,a)),a.push(e)}let r=(e,r)=>{let i=Math.floor(e/16),a=Math.floor(r/16),o=1/0;for(let s=-2;s<=2;s++)for(let c=-2;c<=2;c++){let l=n.get(`${i+s},${a+c}`);if(l)for(let n of l){let i=t[n],a=(i.x-e)*(i.x-e)+(i.z-r)*(i.z-r);a<o&&(o=a)}}return o},i=(e,n)=>{let r=!1;for(let i=0,a=639;i<640;a=i++){let o=t[i],s=t[a],c=o.z,l=s.z;c>n!=l>n&&e<(s.x-o.x)*(n-c)/(l-c+1e-12)+o.x&&(r=!r)}return r},a=(e,r)=>{let i=0,a=1/0,o=Math.floor(e/16),s=Math.floor(r/16);for(let c=-3;c<=3;c++)for(let l=-3;l<=3;l++){let u=n.get(`${o+c},${s+l}`);if(u)for(let n of u){let o=t[n],s=(o.x-e)*(o.x-e)+(o.z-r)*(o.z-r);s<a&&(a=s,i=n)}}return i/640},o=new I,s=new I,c=new I;return{path:e,samples:t,insideLoop:i,minDist2:r,nearestT:a,pointAt:t=>e.getPointAt((t%1+1)%1,o).clone(),normalAt:t=>{let n=e.getTangentAt((t%1+1)%1,s).normalize();return c.set(-n.z,0,n.x).clone()}}}function Hu(e,t,n){return e.insideLoop(t,n)&&e.minDist2(t,n)>=wu*wu}function Uu(e,t,n,r=Eu,i=wu){if(e.insideLoop(t,n))return!1;let a=e.minDist2(t,n);return a>=i*i&&a<=r*r}function Wu(e,t,n,r,i=Eu,a=wu){return t===`infield`?Hu(e,n,r):Uu(e,n,r,i,a)}function Gu(e,t){let n=1/0,r=-1/0,i=1/0,a=-1/0;for(let t of e.samples)t.x<n&&(n=t.x),t.x>r&&(r=t.x),t.z<i&&(i=t.z),t.z>a&&(a=t.z);let o=[],s=0;for(let t=n;t<=r;t+=9)for(let n=i;n<=a;n+=9){s+=1;let r=t+(ju(s,3)-.5)*9*.8,i=n+(ju(s,5)-.5)*9*.8;Hu(e,r,i)&&o.push({x:r,z:i,i:s})}return qu(o,t)}function Ku(e,t,n=Eu,r=wu){let i=[],a=0;for(let t=0;t<e.samples.length;t+=8){let o=t/e.samples.length,s=e.samples[t],c=e.normalAt(o),l=e.insideLoop(s.x+c.x*4,s.z+c.z*4)?-1:1;for(let t=0;t<4;t++){a+=1;let t=r<wu-.5,o=t&&ju(a,47)<.5?r+.4+ju(a,41)*Math.max(2.5,Math.min(5,wu-r)):r+(t?6:3)+ju(a,41)*Math.max(4,n-r-(t?10:6)),u=(ju(a,43)-.5)*10,d=-c.z,f=c.x,p=s.x+c.x*l*o+d*u,m=s.z+c.z*l*o+f*u;Uu(e,p,m,n,r)&&i.push({x:p,z:m,i:a})}}return qu(i,t)}function qu(e,t){if(!e.length)return[];let n=[],r=e.slice();for(let e=0;e<t&&r.length;e++){let t=Math.floor(ju(e+11,19)*r.length)%r.length,i=r.splice(t,1)[0],a=!0;for(let e of n){let t=e.x-i.x,n=e.z-i.z;if(t*t+n*n<144){a=!1;break}}a&&n.push({x:i.x,z:i.z})}let i=0;for(;n.length<t&&r.length&&i++<64;){let e=r.pop();n.push({x:e.x,z:e.z})}for(i=0;n.length<t&&e.length&&i++<64;){let t=e[n.length%e.length];n.push({x:t.x,z:t.z})}return n}function Ju(e,t,n,r=Eu,i=wu){return t===`infield`?Gu(e,n):Ku(e,n,r,i)}function Yu(e,t,n,r){return Math.atan2(n-e,r-t)}function Xu(e,t){let n=Math.abs(((e-t)%1+1)%1);return n>.5&&(n=1-n),n}function Zu(e){return e===`approach`||e===`cross`||e===`return`}function Qu(e){let t=e.userData.wings;return Array.isArray(t)?t:[]}function $u(e){return Bu.find(t=>t.trackId===e)??null}function ed(e){let t=e>>>0;return()=>{t=t+1831565813|0;let e=Math.imul(t^t>>>15,1|t);return e=e+Math.imul(e^e>>>7,61|e)^e,((e^e>>>14)>>>0)/4294967296}}function td(e){let t=2166136261;for(let n=0;n<e.length;n++)t^=e.charCodeAt(n),t=Math.imul(t,16777619);return t>>>0||1}var nd=class e{group=new V;q;spec;animals=[];spawnPool=[];crossCooldown=0;bursts=[];burstGeo=new Y(.16,.16,.16);burstMats;burstPool=[];burstLight;_meshFrame=0;simAccum=0;sharedSteps=0;rng;constructor(e,t,n){this.spec=t,this.rng=ed(n||1),this.crossCooldown=vu+this.rng()*(yu-vu),this.group.name=t.groupName,this.q=Vu(e),this.burstMats=t.burstColors.map(e=>new ut({color:e,transparent:!0,opacity:1,depthWrite:!1})),this.burstLight=new he(16742970,0,16),this.burstLight.visible=!0,this.burstLight.intensity=0,this.group.add(this.burstLight);let r=t.outfieldFar??Eu,i=t.outfieldNear??wu,a=Ju(this.q,t.habitat,Math.max(lu*4,40),r,i);this.spawnPool.push(...a);let o=this.spawnPool.slice(0,lu);for(let e=0;e<o.length;e++){let n=o[e],r=t.createMesh(e),i=ju(e,7)*Math.PI*2;r.position.set(n.x,0,n.z),r.rotation.y=i+Su,this.group.add(r),this.animals.push({mesh:r,mode:`wander`,x:n.x,z:n.z,heading:i,targetX:n.x,targetZ:n.z,crossT:0,crossSign:1,crossLat:t.habitat===`infield`?1:-1,respawnIn:0,walkPhase:ju(e,13)*Math.PI*2,seed:e,wings:Qu(r),hitUntil:0,hiddenUntil:0}),this.pickWanderTarget(this.animals[e])}}static createForTrack(t,n,r=1){let i=$u(t);if(!i)return null;let a=new e(n,i,r>>>0);return a.animals.length?a:null}update(e,t,n,r){this.simAccum+=Math.min(Math.max(0,e),.12);let i=0;for(;this.simAccum>=.05&&i++<6;)this.stepHerd(.05),this.simAccum-=.05;this.present(e,t,n,r,!1)}syncShared(e,t,n,r,i){let a=Math.floor(Math.max(0,e)/.05),o=0;for(;this.sharedSteps<a&&o++<90;)this.stepHerd(.05),this.sharedSteps+=1;this.present(t,n,r,i,!0)}stepHerd(e){this.activeCrossingCount()<bu&&(this.crossCooldown-=e,this.crossCooldown<=0&&this.tryStartCrossing());for(let t of this.animals){if(t.mode===`dead`){t.respawnIn-=e,t.respawnIn<=0&&this.respawnAnimal(t);continue}this.stepAnimal(t,e)}}present(e,t,n,r,i){this.updateBursts(e);let a=!!r?.halfRate&&(this._meshFrame++&1)==1,o=performance.now();for(let r of this.animals)if(r.mode!==`dead`){if(r.hiddenUntil>o){r.mesh.visible=!1;continue}r.hiddenUntil>0&&(r.hiddenUntil=0,r.mesh.visible=!0),a||this.syncMesh(r,e);for(let e of t)if(this.tryHit(r,e,n,i,o))break}}dispose(){this.clearBursts(),this.burstLight.intensity=0,this.burstGeo.dispose();for(let e of this.burstMats)e.dispose();for(let e of this.burstPool)e.material.dispose();this.burstPool.length=0,this.group.removeFromParent(),this.group.traverse(e=>{let t=e;if(!t.isMesh||t.geometry===this.burstGeo)return;t.geometry?.dispose();let n=Array.isArray(t.material)?t.material:[t.material];for(let e of n)e?.dispose()}),this.animals.length=0}farLimit(){return this.spec.outfieldFar??Eu}nearLimit(){return this.spec.outfieldNear??wu}wanderSpeed(){return this.spec.wanderSpeed??hu}approachSpeed(){return this.spec.approachSpeed??_u}crossSpeed(){return this.spec.crossSpeed??gu}hitDist(){return this.spec.hitDist??uu}pickWanderTarget(e){let t=this.q.nearestT(e.x,e.z),n=this.spec.habitat,r=this.farLimit(),i=this.nearLimit(),a=!!this.spec.aerial;for(let t=0;t<24;t++){let o=ju(e.seed*17+t,29)*Math.PI*2,s=a?2.5+ju(e.seed+t,31)*7:8+ju(e.seed+t,31)*18,c=e.x+Math.sin(o)*s,l=e.z+Math.cos(o)*s;if(Wu(this.q,n,c,l,r,i)&&!(this.q.minDist2(c,l)<(i+.5)**2)){e.targetX=c,e.targetZ=l;return}}let o=this.q.pointAt((t+.15)%1),s=this.q.normalAt((t+.15)%1),c=this.q.insideLoop(o.x+s.x*4,o.z+s.z*4)?1:-1,l=i<wu-.5&&ju(e.seed,61)<.55,u=n===`infield`?c*22:-c*(l?i+2.5:i+12);e.targetX=o.x+s.x*u,e.targetZ=o.z+s.z*u}activeCrossingCount(){let e=0;for(let t of this.animals)Zu(t.mode)&&e++;return e}activeCrossingTs(){let e=[];for(let t of this.animals)Zu(t.mode)&&e.push(t.crossT);return e}tryStartCrossing(){if(this.activeCrossingCount()>=bu){this.crossCooldown=2;return}let e=this.animals.filter(e=>e.mode===`wander`);if(!e.length){this.crossCooldown=3;return}let t=this.activeCrossingTs(),n=e.map(e=>{let n=this.q.nearestT(e.x,e.z);return{a:e,t:n,sep:t.length===0?1:Math.min(...t.map(e=>Xu(n,e))),nearRoad:this.q.minDist2(e.x,e.z)}}),r=n.filter(e=>t.length===0||e.sep>=xu);if(!r.length&&t.length>0){let e=(t[0]+.5)%1,i=this.q.pointAt(e),a=n[0],o=1/0;for(let e of n){let t=(e.a.x-i.x)*(e.a.x-i.x)+(e.a.z-i.z)*(e.a.z-i.z);t<o&&(o=t,a=e)}r=[{...a,t:e,sep:.5}]}if(!r.length){this.crossCooldown=2.5;return}r.sort((e,t)=>e.nearRoad-t.nearRoad);let i=r[Math.min(r.length-1,Math.floor(this.rng()*Math.min(3,r.length)))],a=i.a,o=i.t,s=this.q.pointAt(o),c=this.q.normalAt(o),l=this.q.insideLoop(s.x+c.x*4,s.z+c.z*4)?1:-1,u=this.spec.habitat===`outfield`?-1:1,d=s.x+c.x*l*u*Tu,f=s.z+c.z*l*u*Tu;a.mode=`approach`,a.crossT=o,a.crossSign=l,a.crossLat=u,a.targetX=d,a.targetZ=f,this.crossCooldown=vu+this.rng()*(yu-vu)}stepAnimal(e,t){let n=this.wanderSpeed(),r=!!this.spec.aerial;if(e.mode===`wander`){this.moveToward(e,e.targetX,e.targetZ,n,t);let i=e.targetX-e.x,a=e.targetZ-e.z,o=r?1.1:2.5;i*i+a*a<o*o&&this.pickWanderTarget(e),Wu(this.q,this.spec.habitat,e.x,e.z,this.farLimit(),this.nearLimit())||(this.pickWanderTarget(e),this.moveToward(e,e.targetX,e.targetZ,n*1.4,t));return}if(e.mode===`approach`){this.moveToward(e,e.targetX,e.targetZ,this.approachSpeed(),t);let n=e.targetX-e.x,r=e.targetZ-e.z;n*n+r*r<1.2&&(e.mode=`cross`,e.crossLat=this.spec.habitat===`outfield`?-1:1);return}if(e.mode===`cross`||e.mode===`return`){let n=this.crossSpeed(),r=e.mode===`cross`?n:n*.9,i=this.spec.habitat===`outfield`,a=i?1:-1,o=e.mode===`cross`?a:-a;e.crossLat+=o*(r*t/(16.9*.5));let s=this.q.pointAt(e.crossT),c=this.q.normalAt(e.crossT),l=e.crossLat*8.4;e.x=s.x+c.x*e.crossSign*l,e.z=s.z+c.z*e.crossSign*l,e.heading=Yu(e.x,e.z,e.x+c.x*e.crossSign*o,e.z+c.z*e.crossSign*o);let u=e.mode===`cross`&&(i?e.crossLat>=1:e.crossLat<=-1),d=e.mode===`return`&&(i?e.crossLat<=-1:e.crossLat>=1);if(u)e.mode=`return`,e.crossLat=i?1:-1;else if(d){e.mode=`wander`;let t=this.q.pointAt(e.crossT),n=this.q.normalAt(e.crossT),r=this.nearLimit(),a=r<wu-.5&&ju(e.seed+3,71)<.6,o=i?-(a?r+2:20):18;e.x=t.x+n.x*e.crossSign*o,e.z=t.z+n.z*e.crossSign*o,this.pickWanderTarget(e)}}}moveToward(e,t,n,r,i){let a=t-e.x,o=n-e.z,s=Math.hypot(a,o);if(s<.05)return;let c=Math.min(s,r*i);e.x+=a/s*c,e.z+=o/s*c;let l=Math.atan2(a,o)-e.heading;for(;l>Math.PI;)l-=Math.PI*2;for(;l<-Math.PI;)l+=Math.PI*2;e.heading+=Ot.clamp(l,-2.4*i,2.4*i)}syncMesh(e,t){let n=Zu(e.mode),r=!!this.spec.aerial,i=!!this.spec.slither;e.walkPhase+=t*(i?n?7.5:5.2:r&&n?14:e.mode===`wander`?4.2:5.5);let a=Math.sin(e.walkPhase)*(i?.01:r?.03:.04),o=0;if(r&&n)if(e.mode===`approach`){let t=Math.hypot(e.targetX-e.x,e.targetZ-e.z),n=Ot.clamp(1-t/18,.25,1);a=.55+n*.95+Math.sin(e.walkPhase*2.1)*.15,o=-.18*n}else{let t=Math.min(1,Math.abs(e.crossLat));a=.7+(1-t*t)*1.35+Math.sin(e.walkPhase*2.4)*.16,o=e.mode===`return`?.12:-.1}if(e.mesh.position.set(e.x,a,e.z),e.mesh.rotation.y=e.heading+Su,e.mesh.rotation.x=o,e.mesh.rotation.z=Math.sin(e.walkPhase)*(r?.1:i?.12:.05),e.mesh.visible=!0,e.wings.length){let t=0;t=r&&n?Math.sin(e.walkPhase*2.8)*.95:r?.06:Math.sin(e.walkPhase*1.2)*.25,e.wings[0].rotation.x=t,e.wings[1]&&(e.wings[1].rotation.x=-t)}let s=e.mesh.userData.segments;if(i&&Array.isArray(s)){let t=n?.1:.06,r=(e.targetX-e.x)**2+(e.targetZ-e.z)**2,i=n||e.mode===`wander`&&r>1,a=n?1:i?.7:.08;for(let n=0;n<s.length;n++){let r=s[n],i=r.userData.baseY??r.position.y;r.position.z=Math.sin(e.walkPhase+n*.85)*t;let o=n<3?(1-n/3)*a:0;r.position.y=i+o*.14,r.rotation.z=o*(n===0?.42:.18)}}}tryHit(e,t,n,r=!1,i=0){let a=this.hitDist(),o=t.state.position.x-e.x,s=t.state.position.z-e.z;if(o*o+s*s>a*a||Math.abs(t.state.speed)<2.5||e.hitUntil>i)return!1;e.hitUntil=i+400,this.explodeAnimal(e,r);let c=Math.max(pu,Math.abs(t.state.speed)*fu);return t.state.speed=Math.sign(t.state.speed||1)*c,t.animalHitPenalty=Math.max(t.animalHitPenalty,mu),t.hitSpeedCap=Math.min(t.hitSpeedCap,c),t.syncCollision(),n?.({name:this.spec.hitName,target:t}),!0}burstAt(e,t){let n=Math.min(16,24-this.bursts.length);for(let r=0;r<n;r++){let n=this.burstMats[r%this.burstMats.length],i=this.burstPool.pop();i||=new J(this.burstGeo,n.clone());let a=i.material;a.color.copy(n.color),a.opacity=1,i.visible=!0,i.position.set(e+(Math.random()-.5)*.7,.4+Math.random()*.5,t+(Math.random()-.5)*.7),i.scale.setScalar(2.2+Math.random()*1.8);let o=8+Math.random()*12,s=new I((Math.random()-.5)*o,3+Math.random()*7,(Math.random()-.5)*o);this.group.add(i),this.bursts.push({mesh:i,vel:s,life:.42+Math.random()*.28})}this.burstLight.position.set(e,1.6,t),this.burstLight.intensity=2.2}explodeAnimal(e,t){let n=e.x,r=e.z;if(this.burstAt(n,r),e.mesh.visible=!1,t){e.hiddenUntil=performance.now()+6e3;return}e.mode=`dead`,e.respawnIn=Cu}respawnAnimal(e){let t=this.spawnPool,n=t[e.seed%Math.max(1,t.length)]??{x:e.x,z:e.z},r=-1,i=(e.seed*3+(t.length>>1))%Math.max(1,t.length),a=Math.min(t.length,12);for(let o=0;o<a;o++){let a=t[(i+o)%t.length],s=1/0;for(let t of this.animals){if(t===e||t.mode===`dead`)continue;let n=(t.x-a.x)**2+(t.z-a.z)**2;n<s&&(s=n)}s>r&&(r=s,n=a)}e.x=n.x,e.z=n.z,e.mode=`wander`,e.mesh.visible=!0,this.pickWanderTarget(e),this.syncMesh(e,0)}updateBursts(e){for(let t=this.bursts.length-1;t>=0;t--){let n=this.bursts[t];n.life-=e,n.vel.y-=18*e,n.mesh.position.addScaledVector(n.vel,e),n.mesh.rotation.x+=e*6,n.mesh.rotation.z+=e*4;let r=n.mesh.material;r.opacity=Math.max(0,n.life*2.2),n.life<=0&&(this.group.remove(n.mesh),n.mesh.visible=!1,this.burstPool.push(n.mesh),this.bursts.splice(t,1))}this.burstLight.intensity>0&&(this.burstLight.intensity=Math.max(0,this.burstLight.intensity-e*8))}clearBursts(){for(let e of this.bursts)this.group.remove(e.mesh),e.mesh.visible=!1,this.burstPool.push(e.mesh);this.bursts.length=0,this.burstLight.intensity=0}},rd={tier:`high`,antialias:!0,softShadows:!0,shadows:!0,shadowMapSize:2048,shadowFrustum:70,nightLampRange:85,maxNightLamps:18,headlightBeams:!0,engineSmoke:!0,wildlifeHalfRate:!1,cameraFar:700,maxPixelRatio:1},id={tier:`mid`,antialias:!1,softShadows:!0,shadows:!0,shadowMapSize:1024,shadowFrustum:60,nightLampRange:60,maxNightLamps:8,headlightBeams:!0,engineSmoke:!0,wildlifeHalfRate:!0,cameraFar:560,maxPixelRatio:1},ad={tier:`low`,antialias:!1,softShadows:!1,shadows:!1,shadowMapSize:512,shadowFrustum:50,nightLampRange:42,maxNightLamps:4,headlightBeams:!1,engineSmoke:!1,wildlifeHalfRate:!0,cameraFar:450,maxPixelRatio:.85};function od(e){return e===`low`?ad:e===`mid`?id:rd}function sd(){try{let e=document.createElement(`canvas`),t=e.getContext(`webgl2`,{failIfMajorPerformanceCaveat:!1})||e.getContext(`webgl`,{failIfMajorPerformanceCaveat:!1});if(!t)return!0;let n=t.getExtension(`WEBGL_debug_renderer_info`),r=n?String(t.getParameter(n.UNMASKED_RENDERER_WEBGL)??``).toLowerCase():``;return t.getExtension(`WEBGL_lose_context`)?.loseContext(),cd(r)}catch{return!1}}function cd(e){return/llvmpipe|softpipe|swrast|swiftshader|basic render|microsoft basic|mesa offscreen|virtualbox|vmware|parallels|chromium embedded|apple software|gdi generic|virgl|virtio|qemu|red hat/.test(e)}function ld(e){let t=document.createElement(`canvas`);try{let n=t.getContext(`webgl2`,e)||t.getContext(`webgl`,e);return!n||n.isContextLost()?!1:(n.getExtension(`WEBGL_lose_context`)?.loseContext(),!0)}catch{return!1}}function ud(e){let t=[{antialias:e.antialias,powerPreference:`high-performance`,failIfMajorPerformanceCaveat:!1,alpha:!1,stencil:!1,depth:!0},{antialias:!1,powerPreference:`default`,failIfMajorPerformanceCaveat:!1,alpha:!1,stencil:!1,depth:!0},{antialias:!1,powerPreference:`low-power`,failIfMajorPerformanceCaveat:!1,alpha:!1,stencil:!1,depth:!0}],n=t[t.length-1];for(let e of t)if(ld(e)){n=e;break}try{let t=new fa({...n,canvas:e.canvas}),r=t.getContext();if(!r||r.isContextLost?.())throw t.dispose(),Error(`WebGL context was lost immediately`);return t}catch(e){throw e instanceof Error?e:Error(`WebGL unavailable — try another browser, or turn off hardware acceleration and reload`)}}function dd(e,t,n){e.addEventListener(`webglcontextlost`,e=>{e.preventDefault(),t()},!1),e.addEventListener(`webglcontextrestored`,()=>{n()},!1)}var fd=`racer-ghost-v1`,pd=50,md=6e3,hd=.22,gd=6;function _d(e,t){return`${fd}-${e}-${t}`}function vd(e){return e===`bike`?`bike`:e===`car`?`car`:null}function yd(e){let t=Math.PI*2,n=e%t;return n<0&&(n+=t),n}function bd(e){let t=e;for(;t>Math.PI;)t-=Math.PI*2;for(;t<-Math.PI;)t+=Math.PI*2;return t}function xd(e,t){try{let n=localStorage.getItem(_d(e,t));if(!n)return null;let r=JSON.parse(n);if(r.v!==1&&r.v!==2||r.trackId!==e||r.kind!==t||!Number.isFinite(r.timeMs)||r.timeMs<=0||!Array.isArray(r.samples)||r.samples.length<2)return null;let i=[];for(let e of r.samples){if(!e||typeof e!=`object`)continue;let t=e;!Number.isFinite(t.t)||!Number.isFinite(t.x)||!Number.isFinite(t.z)||!Number.isFinite(t.h)||i.push({t:Math.max(0,Math.round(t.t)),x:t.x,z:t.z,h:yd(t.h),lean:t.lean!=null&&Number.isFinite(t.lean)?t.lean:void 0})}return i.length<2?null:{v:r.v,trackId:e,kind:t,timeMs:Math.round(r.timeMs),samples:i}}catch{return null}}function Sd(e){if(e.samples.length<2||e.timeMs<=0)return!1;try{return localStorage.setItem(_d(e.trackId,e.kind),JSON.stringify(e)),!0}catch{return!1}}function Cd(){let e=0;try{let t=[];for(let e=0;e<localStorage.length;e++){let n=localStorage.key(e);n&&n.startsWith(`${fd}-`)&&t.push(n)}for(let n of t)localStorage.removeItem(n),e+=1}catch{}return e}function wd(e){let t=Math.round(e.timeMs);if(!Number.isFinite(t)||t<=0||e.samples.length<2)return!1;let n=xd(e.trackId,e.kind);return n&&n.timeMs<=t?!1:Sd({v:2,trackId:e.trackId,kind:e.kind,timeMs:t,samples:e.samples.slice(0,md)})}var Td=class{samples=[];lastSampleAt=-50;reset(){this.samples=[],this.lastSampleAt=-50}push(e,t,n,r,i=0){!Number.isFinite(e)||e<0||this.samples.length>=md||e-this.lastSampleAt<pd&&this.samples.length>0||(this.lastSampleAt=e,this.samples.push({t:Math.round(e),x:t,z:n,h:yd(r),lean:Math.abs(i)>.004?i:void 0}))}snapshot(){return this.samples.slice()}get length(){return this.samples.length}},Ed=class{mesh;samples=[];scene;path;visibleWanted=!0;coasting=!1;coastT=0;coastSpeed=0;lastElapsed=-1;legacyHeading=!1;_pos=new I;_tan=new I;constructor(e,t,n,r,i,a){this.scene=e,this.path=a,this.mesh=Ve(t,n,13,r),qe(this.mesh),Dt(this.mesh,hd),this.mesh.name=`ghost-racer`,this.samples=i.samples,this.legacyHeading=i.v<2;let o=this.samples[0];this.mesh.position.set(o.x,Ls,o.z),this.mesh.rotation.order=`YXZ`,this.mesh.rotation.y=o.h,this.mesh.rotation.x=0,this.mesh.rotation.z=o.lean??0,e.add(this.mesh)}setVisible(e){this.visibleWanted=e,this.mesh.visible=e}update(e){if(!this.visibleWanted||this.samples.length===0){this.mesh.visible=!1;return}this.mesh.visible=!0;let t=Math.max(0,e),n=this.lastElapsed<0?0:Math.min(.05,Math.max(0,(t-this.lastElapsed)/1e3));if(this.lastElapsed=t,t>=this.samples[this.samples.length-1].t){this.updateCoast(n);return}this.coasting=!1,this.placeFromSamples(t)}placeFromSamples(e){let t=this.samples,n=1;for(;n<t.length&&t[n].t<e;)n+=1;let r=t[n],i=t[n-1],a=Math.max(1,r.t-i.t),o=Math.min(1,Math.max(0,(e-i.t)/a));this.mesh.position.set(i.x+(r.x-i.x)*o,Ls,i.z+(r.z-i.z)*o);let s=(i.lean??0)+((r.lean??0)-(i.lean??0))*o,c=yd(i.h+bd(r.h-i.h)*o),l=s;if(this.legacyHeading){let e=r.x-i.x,t=r.z-i.z;if(e*e+t*t>.04){let n=bd(c-Math.atan2(e,t)),a=Math.max(-.28,Math.min(.28,n));c=yd(c+a),i.lean==null&&r.lean==null&&(l=a*.45)}}this.mesh.rotation.order=`YXZ`,this.mesh.rotation.y=c,this.mesh.rotation.x=0,this.mesh.rotation.z=l}beginCoast(){let e=this.samples[this.samples.length-1],t=this.samples[this.samples.length-2]??e,n=Math.hypot(e.x-t.x,e.z-t.z),r=Math.max(.05,(e.t-t.t)/1e3);this.coastSpeed=Math.min(40,n/r),this._pos.set(e.x,0,e.z),this.coastT=ss(this.path,this._pos).t,this.coasting=!0}updateCoast(e){if(this.coasting||this.beginCoast(),e<=0){this.path.getPointAt(this.coastT,this._pos),this.path.getTangentAt(this.coastT,this._tan),this.mesh.position.set(this._pos.x,Ls,this._pos.z),this.mesh.rotation.y=Math.atan2(this._tan.x,this._tan.z),this.mesh.rotation.z=0;return}this.coastSpeed>4&&(this.coastSpeed=Math.max(4,this.coastSpeed-gd*e));let t=Math.max(1,this.path.getLength());this.coastT=(this.coastT+this.coastSpeed*e/t)%1,this.coastT<0&&(this.coastT+=1),this.path.getPointAt(this.coastT,this._pos),this.path.getTangentAt(this.coastT,this._tan),this.mesh.position.set(this._pos.x,Ls,this._pos.z),this.mesh.rotation.y=Math.atan2(this._tan.x,this._tan.z),this.mesh.rotation.z=0}dispose(){this.scene.remove(this.mesh),Ue(this.mesh),this.samples=[]}},Dd=()=>t(()=>import(`./browser-pBwlB2M7.js`).then(t=>e(t.default,1)),__vite__mapDeps([0,1]));function Od(e){if(!Number.isFinite(e)||e<0)return`--:--.---`;let t=Math.floor(e);if(t===kd)return Ad;kd=t;let n=Math.floor(t/6e4),r=Math.floor(t%6e4/1e3),i=t%1e3;return Ad=`${n}:${r.toString().padStart(2,`0`)}.${i.toString().padStart(3,`0`)}`,Ad}var kd=-1,Ad=`--:--.---`,jd=3,Md=[`3`,`2`,`1`,`GO`],Nd=.4,Pd=1e3,Fd=10,Id=9,Ld=180,Rd=.4,zd=1600,Bd=[1/3,2/3],Vd=`racer.sectors.`,Hd=.42,Ud=3.6,Wd=1.5,Gd=`oval-circuit`,Kd=1.3,qd=[{offset:-2.55,t:-.048,skill:1},{offset:2.35,t:-.038,skill:1.55},{offset:-1.15,t:-.03,skill:1.72},{offset:.85,t:-.022,skill:1.92},{offset:-2.75,t:-.014,skill:2.12},{offset:2.6,t:-.006,skill:2.35}],Jd=3.4,Yd=3,Xd=-.016,Zd=.011,Qd=-.006,$d=0,ef=qd[0].t,tf=0,nf=class{renderer;scene=new me;camera;rearCamera;input=new ys;phonePad=new ks({onDrive:e=>{this.input.setPhoneDrive(e),e.shift&&this.input.requestShift(e.shift),e.pause&&this.input.requestPause()},onMenu:e=>Ds(e),onStatus:e=>this.showToast(e)});touch=new Ns(this.input);touchMode=!1;track=Qo(wa,{sceneryScale:Nd});trackId=wa;menuScenery=!0;boardTrackId=wa;player;rivals=[];audio=new Kl;wantRearview=!1;shadowNeedsWarmup=!0;shadowFrame=0;fpsEmaMs=16.7;perfThrottle=!1;qualityTier=`high`;perf=od(`high`);effectsLevel=`high`;ghostEnabled=!0;ghostPlayer=null;ghostRecorder=new Td;sunLight=null;_coastInput={throttle:0,brake:0,handbrake:0,steer:0,gear:null,shiftDelta:0,reset:!1,pause:!1,fire:!1,jump:!1,descend:!1,lookDown:!1};_pathScratch=new I;running=!1;finished=!1;paused=!1;practice=!1;solo=!1;online=!1;eventMode=!1;eventGameMode=`race`;battleCubes=[];battlePickupPending=new Map;battlePrevX=0;battlePrevZ=0;battlePrevValid=!1;trackWidthScale=1;battleRoulette=null;remotes=new Map;seenRemoteIds=new Set;net;pingTimer=0;labelRoot=document.getElementById(`player-tags`);garage=$l();inLobby=!1;expectingLobby=!1;expectingSpectate=!1;roomSpectating=!1;preferredSpectateTargetId=null;lobbyPlayers=[];mpCreateTrackId=wa;mpCreateKind=`car`;mpCreateWeather=`dry`;mpInviteSelected=new Set;mpWeatherPreview=!1;buyInPayMethod=`cashu`;buyInInvoice=null;devPubkey=null;devPubkeyFetched=!1;devShowReadFeedback=!1;devLivePollTimer=null;devLivePollInFlight=!1;lap=1;lastT=0;crossedOnce=!1;gates=new as;raceStart=0;lapStart=0;bestLap=1/0;sectorIdx=0;sectorStartMs=0;sectorRef=null;pauseTotal=0;pauseBegan=0;lastFrame=performance.now();lastHudAt=0;camPos=new I;camLook=new I;stickyT=new WeakMap;el={speed:document.getElementById(`speed`),gear:document.getElementById(`gear`),speedDial:document.getElementById(`speed-dial`),tachFill:document.getElementById(`tach-fill`),tachNeedle:document.getElementById(`tach-needle`),lap:document.getElementById(`lap`),time:document.getElementById(`time`),best:document.getElementById(`best`),overlay:document.getElementById(`overlay`),finish:document.getElementById(`finish`),pause:document.getElementById(`pause`),pauseBtn:document.getElementById(`pause-btn`),finalTime:document.getElementById(`final-time`),finalBest:document.getElementById(`final-best`),finishEyebrow:document.getElementById(`finish-eyebrow`),finishTitle:document.getElementById(`finish-title`),finalPlace:document.getElementById(`final-place`),mpMapVote:document.getElementById(`mp-map-vote`),mpMapVoteGrid:document.getElementById(`mp-map-vote-grid`),mpMapVoteStatus:document.getElementById(`mp-map-vote-status`),restartBtn:document.getElementById(`restart-btn`),position:document.getElementById(`position`),netStatus:document.getElementById(`net-status`),wrongWay:document.getElementById(`wrong-way`),delta:document.getElementById(`delta`),leaderboard:document.getElementById(`leaderboard`),boardList:document.getElementById(`board-list`),boardSource:document.getElementById(`board-source`),nameEntry:document.getElementById(`name-entry`),driverName:document.getElementById(`driver-name`),countdown:document.getElementById(`countdown`),rearview:document.getElementById(`rearview-frame`),minimap:document.getElementById(`minimap`),wallHits:document.getElementById(`wall-hits`),explodeFlash:document.getElementById(`explode-flash`),spectateHud:document.getElementById(`spectate-hud`),spectateTitle:document.getElementById(`spectate-title`),spectateHint:document.getElementById(`spectate-hint`),spectateNextBtn:document.getElementById(`spectate-next-btn`),animalHit:document.getElementById(`animal-hit`),mapSelect:document.getElementById(`map-select`),mapGrid:document.getElementById(`map-grid`),mapSelectTitle:document.getElementById(`map-select-title`),mapSelectTagline:document.getElementById(`map-select-tagline`),boardTrackGrid:document.getElementById(`board-track-grid`),garage:document.getElementById(`garage`),multiplayer:document.getElementById(`multiplayer`),garagePrimary:document.getElementById(`garage-primary`),garageAccent:document.getElementById(`garage-accent`),mpEntry:document.getElementById(`mp-entry`),mpCreate:document.getElementById(`mp-create`),mpJoin:document.getElementById(`mp-join`),mpLobby:document.getElementById(`mp-lobby`),mpCreateName:document.getElementById(`mp-create-name`),mpCreateRoom:document.getElementById(`mp-create-room`),mpCreatePass:document.getElementById(`mp-create-pass`),mpCreateMax:document.getElementById(`mp-create-max`),mpCreateStatus:document.getElementById(`mp-create-status`),mpCreateTrackGrid:document.getElementById(`mp-create-track-grid`),mpJoinName:document.getElementById(`mp-join-name`),mpJoinRoom:document.getElementById(`mp-join-room`),mpJoinPass:document.getElementById(`mp-join-pass`),mpJoinStatus:document.getElementById(`mp-join-status`),mpLobbyTitle:document.getElementById(`mp-lobby-title`),mpLobbyMeta:document.getElementById(`mp-lobby-meta`),mpLobbyPlayers:document.getElementById(`mp-lobby-players`),mpLobbyFeed:document.getElementById(`mp-lobby-feed`),mpStatus:document.getElementById(`mp-status`),mpStartBtn:document.getElementById(`mp-start-btn`)};weather;pendingFinishMs=0;mapVoteOptions=[];mapVoteTrackId=``;mapVoteEndsAt=0;mapVoteReceived=0;mapVoteTotal=0;mapVoteTimer=0;scoreSaveInFlight=!1;animalHitUntil=0;boardLoadGen=0;wallHits=0;wallTouching=!1;wallHitCooldown=0;lastWallSideCar=1;damageScuffs=[];damagePanels=[];damageGlass=null;damageBodyEmissive=null;engineSmoke=null;engineSmokeLife=null;engineSmokeVel=null;engineSmokeTex=null;_smokeWorld=new I;_scuffGeo=new Y(.02,.18,.34);_scuffMat=new U({color:658448,roughness:.95,metalness:.05});exploding=!1;onlineWrecked=!1;localWreckFire=null;wreckBannerUntil=0;wreckContactS=0;wreckedIds=new Set;lastFieldResetAt=0;spectating=!1;spectateTargetId=null;spectateJumpHeld=!1;onlineFinishPending=!1;godMode=!1;explodeRestartAt=0;explodeParts=[];explodeFlashLight=null;wildlife=null;onlineAnimalSeed=1;_wildlifePack=[];minimapPath=null;minimapPts=[];minimapBounds={cx:0,cz:0,span:1};minimapCtx=null;minimapTrackCanvas=null;minimapTrackKey=``;rearLayoutKey=``;countdownIndex=-1;countdownStepAt=0;_camIdeal=new I;_camLookTarget=new I;_wallN=new I;_lapTangent=new I;_explodeGeo=new Y(.28,.28,.28);_pack=[];_lampMeshes=[];_rivalCss=at.rivals.map(e=>`#${e.toString(16).padStart(6,`0`)}`);_rearAspect=0;viewport=Ms();constructor(e){let t=c();this.qualityTier=s(t.graphics),this.effectsLevel=t.effects,this.ghostEnabled=t.ghost,sd()&&(this.qualityTier=`low`),this.perf=od(this.qualityTier),this.perfThrottle=this.qualityTier!==`high`,this.audio.setMasterVolume(a(t.sound)),this.renderer=ud({canvas:e,antialias:this.perf.antialias}),this.renderer.setPixelRatio(Math.min(devicePixelRatio,this.perf.maxPixelRatio));let n=this.viewport;this.renderer.setSize(n.w,n.h),this.renderer.setClearColor(8888508,1),this.renderer.shadowMap.enabled=this.perf.shadows,this.renderer.shadowMap.type=this.perf.softShadows?2:0,this.renderer.shadowMap.autoUpdate=!1,this.renderer.toneMapping=4,this.renderer.toneMappingExposure=1.2,this.renderer.outputColorSpace=te,dd(e,()=>{this.showToast(`Graphics hiccup — recovering…`)},()=>{this.shadowNeedsWarmup=!0,this.applyPerfSettings(this.qualityTier,{force:!0}),this.showToast(`Graphics restored`)}),this.camera=new Te(55,n.w/n.h,.1,this.perf.cameraFar),this.rearCamera=new Te(70,1.6,.2,Math.min(400,this.perf.cameraFar)),_t(this.camera,this.rearCamera),this.scene.background=new k(8888508),this.scene.fog=new vt(8888508,160,Math.min(520,this.perf.cameraFar+40)),this.explodeFlashLight=new he(16742970,0,28),this.explodeFlashLight.visible=!0,this.explodeFlashLight.intensity=0,this.scene.add(this.explodeFlashLight),this.net=new hc({onWelcome:e=>this.onNetWelcome(e),onJoin:e=>{this.inLobby||this.roomSpectating&&!this.running?(this.upsertLobbyPlayer(e),this.inLobby&&this.renderLobby()):this.running&&(this.spawnRemote(e),this.online&&!this.roomSpectating&&this.showToast(`${e.name} joined the race`),this.roomSpectating&&this.spectating&&this.refreshSpectateHud())},onLeave:(e,t)=>{if(this.inLobby||this.roomSpectating&&!this.running)this.lobbyPlayers=this.lobbyPlayers.filter(t=>t.id!==e),t&&(this.net.hostId=t),this.inLobby&&this.renderLobby();else{let t=this.remotes.get(e)?.name;this.removeRemote(e),t&&this.online&&!this.roomSpectating&&this.showToast(`${t} left the room`),this.roomSpectating&&this.spectating&&this.spectateTargetId===e&&(this.cycleSpectateTarget(1)||this.exitSpectate())}},onClosed:e=>{let t=this.running;this.showToast(e),t?this.goHome():this.closeMultiplayer()},onNotice:e=>{if(this.pushLobbyNotice(e),this.inLobby){this.el.mpStatus.textContent=e;let t=document.getElementById(`mp-invoice-status`);t&&/buy-in request|token rejected/i.test(e)&&(t.textContent=e)}},onLobby:e=>{this.inLobby&&(this.lobbyPlayers=e.players,this.net.hostId=e.hostId,this.net.trackId=e.trackId,this.net.kind=e.kind===`bike`?`bike`:`car`,this.net.weather=St(e.weather),this.net.maxPlayers=e.maxPlayers,this.applyMenuWeatherPreview(this.net.weather),this.renderLobby())},onStart:(e,t,n,r,i)=>{this.onlineAnimalSeed=td(`${t}:${Math.round(e)}`),this.beginOnlineRace(t,n,r,i)},onCubeTaken:e=>this.onBattleCubeTaken(e),onCubesDropped:e=>this.onBattleCubesDropped(e),onWrecked:(e,t)=>this.applyOnlineWreck(e,t),onFieldReset:()=>this.applyOnlineFieldReset(),onRaceResult:(e,t,n,r,i)=>this.finishRace({winnerId:e,winnerName:t,officialTimeMs:n,trackOptions:r,voteEndsAt:i}),onVoteUpdate:(e,t,n)=>this.updateMapVote(e,t,n),onVoteResult:e=>this.showMapVoteResult(e),onState:(e,t)=>this.onNetState(e,t),onPeerPose:(e,t)=>this.onNetPeerPose(e,t),onEventInvoice:(e,t,n,r,i,a)=>this.showBuyInInvoice(e,t,n,r,i,a),onPayoutResult:e=>this.onPayoutResult(e),onBuyInRefund:e=>this.onBuyInRefund(e),onEventUpdate:e=>{e&&document.getElementById(`event-checkout`)&&!document.getElementById(`event-checkout`)?.classList.contains(`hidden`)&&this.updateEventTipBreakdown()},onError:e=>{if(this.expectingLobby&&!this.inLobby&&(this.expectingLobby=!1),this.expectingSpectate){this.expectingSpectate=!1,this.preferredSpectateTargetId=null;let t=document.getElementById(`dev-live-status`);t&&(t.textContent=`Watch failed — ${e}`),document.getElementById(`dev-dash`)?.classList.remove(`hidden`),this.startDevLiveFeed()}this.setNetStatus(e,`bad`),this.setMpFormStatus(e),this.el.mpStatus.textContent=e,!this.running&&!this.inLobby&&!this.el.multiplayer.classList.contains(`hidden`)&&(this.online=!1)},onStatus:e=>{this.expectingLobby&&!this.inLobby&&/fail|Disconnect|error|already|full|wrong|not found/i.test(e)&&(this.expectingLobby=!1),this.expectingSpectate&&/fail|Disconnect|error|not found|not the dev|stale auth/i.test(e)&&(this.expectingSpectate=!1,this.preferredSpectateTargetId=null);let t=/fail|Disconnect|full|error|wrong|not found|already/i.test(e);this.setNetStatus(e,t?`bad`:`ok`),!this.running&&!this.el.multiplayer.classList.contains(`hidden`)&&(this.setMpFormStatus(e),this.inLobby&&(this.el.mpStatus.textContent=e)),/Disconnect/i.test(e)&&this.inLobby&&!this.running&&!this.net.connected&&!this.net.id&&this.closeMultiplayer(),/Disconnect/i.test(e)&&this.roomSpectating&&!this.net.connected&&this.goHome()}}),this.buildWorld(),this.spawnVehicles(),this.setAiVisible(!1),this.snapCamera(),this.bindUi(),this.refreshTouchMode(),this.refreshDevAccess(),addEventListener(`resize`,()=>this.onResize()),addEventListener(`orientationchange`,()=>{setTimeout(()=>{this.refreshTouchMode(),this.onResize()},250)}),setInterval(()=>{!this.net.connected||!this.online||this.el.netStatus.classList.contains(`bad`)||(this.inLobby?this.setNetStatus(`Lobby · ${this.net.room}`,`ok`):this.running&&this.setNetStatus(`Sats Racer · ${this.net.room}`,`ok`))},2e3),window.visualViewport?.addEventListener(`resize`,()=>this.onResize()),window.matchMedia(`(pointer: coarse)`).addEventListener(`change`,()=>this.refreshTouchMode()),window.matchMedia(`(hover: none)`).addEventListener(`change`,()=>this.refreshTouchMode()),document.addEventListener(`visibilitychange`,()=>{document.hidden?this.input.clearDriveKeys():this.running&&!this.paused&&!this.finished&&this.audio.unlock()}),this.renderer.setAnimationLoop(()=>this.frame())}refreshTouchMode(){this.touchMode=js(),this.touch.syncMode(this.touchMode),this.syncTouchControls()}syncTouchControls(){let e=this.touchMode&&this.running&&!this.paused&&!this.finished&&!this.exploding&&!this.onlineWrecked;this.touch.setVisible(e)}bindUi(){document.getElementById(`start-btn`).onclick=()=>{this.bootFromMenu({trackId:Da(this.trackId)})},document.getElementById(`test-drive-btn`).onclick=()=>{this.unlockAndMaybeMenuMusic().then(()=>this.openMapSelect())},document.getElementById(`solo-race-btn`).onclick=()=>{this.bootFromMenu({solo:!0,trackId:Da(this.trackId)})},document.getElementById(`multiplayer-btn`).onclick=()=>{this.unlockAndMaybeMenuMusic().then(()=>Wt(`Sign in with Nostr to race on Sats Racer`)).then(e=>{e&&this.openMultiplayer()})},document.getElementById(`event-btn`).onclick=()=>{this.unlockAndMaybeMenuMusic().then(()=>Wt(`Sign in with Nostr to race event mode`)).then(e=>{e&&this.openMultiplayer(!0)})},document.getElementById(`mp-event-pick-race`).onclick=()=>this.setEventGameModePick(`race`),document.getElementById(`mp-event-pick-battle`).onclick=()=>this.setEventGameModePick(`battle`),document.getElementById(`map-select-back`).onclick=()=>this.closeMapSelect(),document.getElementById(`test-drift-btn`).onclick=()=>{this.bootFromMenu({practice:!0,solo:!0,trackId:ba})},document.getElementById(`restart-btn`).onclick=()=>{this.audio.unlock().then(()=>{this.audio.stopRaceAudio();let e=this.online||this.solo||this.practice?this.trackId:Da(this.trackId);this.startRace({solo:this.solo,practice:this.practice,trackId:e})})},document.getElementById(`resume-btn`).onclick=()=>this.resume(),document.getElementById(`pause-restart-btn`).onclick=()=>{this.audio.unlock().then(()=>{this.audio.stopRaceAudio(),this.startRace({practice:this.practice,solo:this.solo,trackId:this.trackId})})},document.getElementById(`pause-home-btn`).onclick=()=>this.goHome(),document.getElementById(`finish-home-btn`).onclick=()=>this.goHome(),this.el.pauseBtn.onclick=()=>this.pause(),this.el.spectateNextBtn.onclick=e=>{e.stopPropagation(),this.spectating&&this.cycleSpectateTarget(1)},document.getElementById(`home-board-btn`).onclick=()=>{this.unlockAndMaybeMenuMusic().then(()=>this.openLeaderboard())},document.getElementById(`dev-btn`).onclick=()=>{this.unlockAndMaybeMenuMusic().then(()=>this.openDevDash())},document.getElementById(`dev-close-btn`).onclick=()=>this.closeDevDash(),document.getElementById(`dev-claim-all`).onclick=()=>void this.claimDevTip(),document.getElementById(`dev-withdraw-btn`).onclick=()=>void this.withdrawDevWallet(),document.getElementById(`dev-withdraw-copy`).onclick=()=>this.copyDevWithdrawToken(),document.getElementById(`dev-orphan-copy`).onclick=()=>this.copyDevOrphanToken(),document.getElementById(`dev-god-btn`).onclick=()=>this.toggleGodMode(),document.getElementById(`home-garage-btn`).onclick=()=>{this.unlockAndMaybeMenuMusic().then(()=>this.openGarage())},document.getElementById(`board-close-btn`).onclick=()=>{this.el.leaderboard.classList.add(`hidden`),this.audio.playMenuMusic()},document.getElementById(`garage-back-btn`).onclick=()=>this.closeGarage(!1),document.getElementById(`garage-save-btn`).onclick=()=>this.closeGarage(!0),document.getElementById(`garage-kind-car`).onclick=()=>this.setGarageKind(`car`),document.getElementById(`garage-kind-bike`).onclick=()=>this.setGarageKind(`bike`),document.getElementById(`garage-kind-bird`).onclick=()=>this.setGarageKind(`bird`),this.el.garagePrimary.addEventListener(`input`,()=>{this.setGarageChannel(`primary`,nu(this.el.garagePrimary.value,this.garage.primary))}),this.el.garageAccent.addEventListener(`input`,()=>{this.setGarageChannel(`accent`,nu(this.el.garageAccent.value,this.garage.accent))}),this.bindGarageColorPickers(),document.getElementById(`mp-back-btn`).onclick=()=>this.closeMultiplayer(),document.getElementById(`mp-goto-create`).onclick=()=>this.showMpView(`create`),document.getElementById(`mp-goto-join`).onclick=()=>this.showMpView(`join`),document.getElementById(`mp-create-back`).onclick=()=>this.cancelMpConnect(`entry`),document.getElementById(`mp-join-back`).onclick=()=>this.cancelMpConnect(`entry`),document.getElementById(`mp-lobby-leave`).onclick=()=>{this.leaveLobby()},this.el.mpStartBtn.onclick=()=>{this.net.isHost&&this.net.startRace()},document.getElementById(`mp-create-form`).addEventListener(`submit`,e=>{e.preventDefault(),this.createMultiplayerRoom()}),document.getElementById(`mp-send-friends-toggle`)?.addEventListener(`click`,()=>{let e=document.getElementById(`mp-send-friends-panel`);if(!e)return;e.classList.toggle(`hidden`);let t=!e.classList.contains(`hidden`),n=document.getElementById(`mp-send-friends-toggle`);if(n){let e=this.mpInviteSelected.size;n.textContent=t?`HIDE FRIENDS`:e>0?`INVITE FRIENDS (${e})`:`INVITE FRIENDS`}}),document.getElementById(`mp-send-friends-list`)?.addEventListener(`click`,e=>{let t=e.target?.closest(`button[data-invite-pk]`);if(!t)return;e.preventDefault(),e.stopPropagation();let n=(t.dataset.invitePk||``).toLowerCase();/^[0-9a-f]{64}$/.test(n)&&(this.mpInviteSelected.has(n)?this.mpInviteSelected.delete(n):this.mpInviteSelected.add(n),t.classList.toggle(`is-selected`,this.mpInviteSelected.has(n)),t.setAttribute(`aria-pressed`,this.mpInviteSelected.has(n)?`true`:`false`),this.syncMpInviteToggleLabel())}),document.getElementById(`mp-join-form`).addEventListener(`submit`,e=>{e.preventDefault(),this.joinMultiplayerRoom()}),this.el.mpCreateMax.max=`6`,this.el.mpCreateMax.addEventListener(`input`,()=>{let e=Number(this.el.mpCreateMax.value);Number.isFinite(e)&&e>6&&(this.el.mpCreateMax.value=`6`)}),this.el.mpCreateMax.addEventListener(`change`,()=>{let e=Number(this.el.mpCreateMax.value);Number.isFinite(e)&&this.el.mpCreateMax.value&&e<2&&(this.el.mpCreateMax.value=`2`)}),document.getElementById(`mp-create-kind-car`).onclick=()=>this.setMpCreateKind(`car`),document.getElementById(`mp-create-kind-bike`).onclick=()=>this.setMpCreateKind(`bike`),document.getElementById(`mp-create-weather-dry`).onclick=()=>this.setMpCreateWeather(`dry`),document.getElementById(`mp-create-weather-rain`).onclick=()=>this.setMpCreateWeather(`rain`),document.getElementById(`mp-create-weather-night`).onclick=()=>this.setMpCreateWeather(`night`),this.el.overlay.addEventListener(`pointerdown`,()=>{this.unlockAndMaybeMenuMusic()}),this.el.mapSelect.addEventListener(`pointerdown`,()=>{this.unlockAndMaybeMenuMusic()}),document.getElementById(`submit-score-btn`).onclick=()=>void this.saveDriverScore(),document.getElementById(`nostr-save-login-btn`).onclick=()=>{Wt(`Sign in to save your time on the verified board`).then(e=>{e&&this.renderNameEntryState()})},document.getElementById(`mp-invoice-copy`).onclick=()=>this.copyBuyInInvoice(),document.getElementById(`mp-pay-cashu`).onclick=()=>this.setBuyInPayMethod(`cashu`),document.getElementById(`mp-pay-ln`).onclick=()=>this.setBuyInPayMethod(`lightning`),document.getElementById(`mp-token-submit`).onclick=()=>this.submitBuyInToken(),document.getElementById(`mp-token-input`).addEventListener(`keydown`,e=>{e.key===`Enter`&&(e.preventDefault(),this.submitBuyInToken())}),document.getElementById(`event-tip-range`).oninput=()=>this.updateEventTipBreakdown(),document.getElementById(`event-claim-btn`).onclick=()=>this.claimEventPot(),document.getElementById(`event-token-copy`).onclick=()=>{let e=document.getElementById(`event-payout-token`),t=document.getElementById(`event-token-copy`);navigator.clipboard.writeText(e.value).then(()=>{t.textContent=`COPIED ✓`,setTimeout(()=>t.textContent=`COPY TOKEN`,1500)}).catch(()=>e.select())},v(()=>{this.el.nameEntry.classList.contains(`hidden`)||this.renderNameEntryState(),this.refreshDevAccess()}),this.el.driverName.addEventListener(`keydown`,e=>{e.key===`Enter`&&this.saveDriverScore()}),this.el.driverName.addEventListener(`input`,()=>{let e=this.el.driverName.value.normalize(`NFKC`).replace(/[^\p{L}\p{N} _]/gu,``).slice(0,15);e!==this.el.driverName.value&&(this.el.driverName.value=e)}),document.addEventListener(`keydown`,e=>{if(!this.online||!this.finished||this.el.mpMapVote.classList.contains(`hidden`))return;let t=/^(?:Digit|Numpad)([1-6])$/.exec(e.code);if(!t)return;let n=this.mapVoteOptions[Number(t[1])-1];n&&(e.preventDefault(),e.stopPropagation(),this.castMapVote(n))}),this.bindMuteBtn()}bindMuteBtn(){let e=document.getElementById(`mute-btn`);this.syncMuteBtn(),e.onclick=()=>{this.audio.unlock().then(()=>{this.audio.toggleUserMute(),this.syncMuteBtn(),!this.audio.isUserMuted&&this.onHomeOrBoard()&&this.audio.playMenuMusic()})}}syncMuteBtn(){let e=document.getElementById(`mute-btn`),t=this.audio.isUserMuted;e.setAttribute(`aria-pressed`,t?`true`:`false`),e.setAttribute(`aria-label`,t?`Unmute sound`:`Mute sound`),e.querySelector(`.mute-icon-on`).classList.toggle(`hidden`,t),e.querySelector(`.mute-icon-off`).classList.toggle(`hidden`,!t);let n=this.onHomeOrBoard();e.classList.toggle(`hidden`,!(n||this.paused)),Yt(n||this.finished),p(n)}onHomeOrBoard(){let e=!this.el.mapSelect.classList.contains(`hidden`),t=!this.el.leaderboard.classList.contains(`hidden`),n=!this.el.garage.classList.contains(`hidden`),r=!this.el.multiplayer.classList.contains(`hidden`),i=!document.getElementById(`social-hub`)?.classList.contains(`hidden`),a=!document.getElementById(`dev-dash`)?.classList.contains(`hidden`);return!this.running&&!this.finished&&!this.paused&&(!this.el.overlay.classList.contains(`hidden`)||e||t||n||r||!!i||!!a)}openGarage(){this.el.mapSelect.classList.add(`hidden`),this.el.leaderboard.classList.add(`hidden`),this.el.multiplayer.classList.add(`hidden`),document.getElementById(`social-hub`)?.classList.add(`hidden`),document.getElementById(`dev-dash`)?.classList.add(`hidden`),this.garage=$l(),this.closeGarageSwatchPalettes(),this.syncGarageUi(),this.el.garage.classList.remove(`hidden`),this.syncMuteBtn(),this.devAccessAllowed().then(e=>this.syncGarageDevKinds(e))}closeGarage(e){this.closeGarageSwatchPalettes(),e?(this.garage=eu({kind:this.garage.kind,primary:nu(this.el.garagePrimary.value,this.garage.primary),accent:nu(this.el.garageAccent.value,this.garage.accent)}),this.applyGarageToWorld(!0)):this.garage=$l(),this.el.garage.classList.add(`hidden`),this.audio.playMenuMusic(),this.syncMuteBtn()}setGarageKind(e){this.garage.kind=e,this.syncGarageUi()}syncGarageUi(){document.getElementById(`garage-kind-car`)?.classList.toggle(`is-active`,this.garage.kind===`car`),document.getElementById(`garage-kind-bike`)?.classList.toggle(`is-active`,this.garage.kind===`bike`),document.getElementById(`garage-kind-bird`)?.classList.toggle(`is-active`,this.garage.kind===`bird`),this.el.garagePrimary.value=tu(this.garage.primary),this.el.garageAccent.value=tu(this.garage.accent),this.syncGarageSwatches();let e=document.getElementById(`garage-hint`);e&&(e.textContent={car:`Car selected — same speed as bikes, AI rivals become cars`,bike:`Bike selected — same speed as cars, AI rivals become bikes`,bird:`Bird mode — WASD · Space up · C down · V look down · Shift boost`}[this.garage.kind]),this.syncGarageSwatchPaletteActive()}garageSwatchBtn(e){let t=document.getElementById(e===`primary`?`garage-primary-swatch`:`garage-accent-swatch`);return t instanceof HTMLButtonElement?t:null}garageSwatchPalette(e){let t=document.getElementById(e===`primary`?`garage-primary-palette`:`garage-accent-palette`);return t instanceof HTMLElement?t:null}syncGarageSwatches(){let e=this.garageSwatchBtn(`primary`),t=this.garageSwatchBtn(`accent`);e&&(e.style.background=tu(this.garage.primary)),t&&(t.style.background=tu(this.garage.accent))}setGarageChannel(e,t){e===`primary`?this.garage.primary=t:this.garage.accent=t,this.el.garagePrimary.value=tu(this.garage.primary),this.el.garageAccent.value=tu(this.garage.accent),this.syncGarageSwatches(),this.syncGarageSwatchPaletteActive()}closeGarageSwatchPalettes(){for(let e of[`primary`,`accent`]){let t=this.garageSwatchPalette(e),n=this.garageSwatchBtn(e);t?.classList.add(`hidden`),n?.setAttribute(`aria-expanded`,`false`)}}openGarageSwatchPalette(e){for(let t of[`primary`,`accent`]){let n=this.garageSwatchPalette(t),r=this.garageSwatchBtn(t),i=t===e;n?.classList.toggle(`hidden`,!i),r?.setAttribute(`aria-expanded`,i?`true`:`false`)}this.syncGarageSwatchPaletteActive()}openNativeGarageColor(e){this.closeGarageSwatchPalettes();let t=e===`primary`?this.el.garagePrimary:this.el.garageAccent,n=t;t.style.pointerEvents=`auto`;try{typeof n.showPicker==`function`?n.showPicker():t.click()}catch{t.click()}finally{requestAnimationFrame(()=>{t.style.pointerEvents=``})}}bindGarageColorPickers(){for(let e of[`primary`,`accent`]){let t=this.garageSwatchBtn(e),n=this.garageSwatchPalette(e);if(!(!t||!n)){n.replaceChildren();for(let t of Jl){let r=document.createElement(`button`);r.type=`button`,r.className=`garage-swatch-chip`,r.style.background=tu(t),r.dataset.color=String(t),r.title=tu(t),r.setAttribute(`role`,`option`),r.onclick=n=>{n.stopPropagation(),this.setGarageChannel(e,t),this.closeGarageSwatchPalettes()},n.appendChild(r)}t.setAttribute(`aria-expanded`,`false`),t.onclick=t=>{t.preventDefault(),t.stopPropagation(),n.classList.contains(`hidden`)?this.openGarageSwatchPalette(e):this.closeGarageSwatchPalettes()},t.oncontextmenu=t=>{t.preventDefault(),t.stopPropagation(),this.openNativeGarageColor(e)}}}this.el.garage.addEventListener(`pointerdown`,e=>{let t=e.target;t instanceof Node&&(t instanceof Element&&t.closest(`.garage-color-field`)||this.closeGarageSwatchPalettes())})}syncGarageSwatchPaletteActive(){for(let e of[`primary`,`accent`]){let t=this.garageSwatchPalette(e);if(!t)continue;let n=e===`primary`?this.garage.primary:this.garage.accent;for(let e of t.querySelectorAll(`.garage-swatch-chip`))e instanceof HTMLElement&&e.classList.toggle(`is-active`,Number(e.dataset.color)===n)}}openMultiplayer(e=!1){this.eventMode=e,this.eventGameMode=`race`,this.el.mapSelect.classList.add(`hidden`),this.el.leaderboard.classList.add(`hidden`),this.el.garage.classList.add(`hidden`),document.getElementById(`social-hub`)?.classList.add(`hidden`),document.getElementById(`dev-dash`)?.classList.add(`hidden`),this.garage=$l(),this.mpCreateKind=this.garage.kind===`bike`?`bike`:`car`,this.mpCreateWeather=`dry`,this.mpCreateTrackId=wa,document.getElementById(`mp-create-buyin-field`)?.classList.toggle(`hidden`,!e),document.getElementById(`mp-event-mode-pick`)?.classList.toggle(`hidden`,!e);let t=document.getElementById(`mp-race-mode-label`);t&&(t.textContent=`Event type`),this.syncEventGameModePickUi(),this.syncEventBuyInLabel();let n=document.querySelector(`#mp-entry h1`);n&&(n.textContent=e?`EVENT MODE`:`MULTIPLAYER`);let r=document.querySelector(`#mp-entry .tagline`);r&&(r.textContent=e?`Buy-in sats · Race or Battle — set mode when you create the room`:`Create a private room or join with a password`);let i=!!_(),a=i?this.nostrDisplayName()??Tl()??``:``;this.el.mpCreateName.value=a,this.el.mpJoinName.value=a,i&&this.nostrDisplayNameAsync().then(e=>{e&&(this.el.mpCreateName.value===a&&(this.el.mpCreateName.value=e),this.el.mpJoinName.value===a&&(this.el.mpJoinName.value=e))}),this.el.mpCreatePass.value=``,this.el.mpJoinPass.value=``,this.el.mpCreateRoom.value.trim()||(this.el.mpCreateRoom.value=`circuit`),this.el.mpJoinRoom.value.trim()||(this.el.mpJoinRoom.value=`circuit`),this.el.mpCreateStatus.textContent=`Vehicle class and weather apply to everyone in the room`,this.el.mpJoinStatus.textContent=`Vehicle class and weather are set by the host · garage paint still applies`,this.refreshMpFriendInviteUi(),this.showMpView(`entry`),this.el.multiplayer.classList.remove(`hidden`),this.syncMuteBtn()}joinFromInvite(e){this.unlockAndMaybeMenuMusic().then(()=>Wt(`Sign in with Nostr to join the race room`)).then(async t=>{if(!t)return;this.openMultiplayer(!!e.eventMode),this.showMpView(`join`);let n=this.sanitizeRoomName(e.room);this.el.mpJoinRoom.value=n,this.el.mpJoinPass.value=String(e.password||``).slice(0,32);let r=this.nostrDisplayName()??await this.nostrDisplayNameAsync()??Tl()??``;if(r&&(this.el.mpJoinName.value=r),!this.el.mpJoinName.value.trim()){this.el.mpJoinStatus.textContent=`Enter a racer name, then join`,this.el.mpJoinName.focus();return}await this.joinMultiplayerRoom()})}hostLobbyFromInvite(e){this.unlockAndMaybeMenuMusic().then(()=>Wt(`Sign in with Nostr to host a lobby`)).then(async t=>{if(!t)return;this.openMultiplayer(!1),this.showMpView(`create`);let n=this.sanitizeRoomName(e.room);this.el.mpCreateRoom.value=n,this.el.mpCreatePass.value=String(e.password||``).slice(0,32);let r=this.nostrDisplayName()??await this.nostrDisplayNameAsync()??Tl()??``;if(r&&(this.el.mpCreateName.value=r),!this.el.mpCreateName.value.trim()){this.el.mpCreateStatus.textContent=`Enter a racer name, then create`,this.el.mpCreateName.focus();return}await this.createMultiplayerRoom()})}closeMultiplayer(){this.expectingLobby=!1,this.inLobby=!1,this.online=!1,this.eventMode=!1,this.eventGameMode=`race`,this.clearBattleCubes(),this.lobbyPlayers=[],this.net.disconnect(),this.clearRemotes(),this.el.netStatus.classList.add(`hidden`),this.el.mpLobbyFeed.innerHTML=``,document.getElementById(`mp-buyin`)?.classList.add(`hidden`),document.getElementById(`mp-event-mode-pick`)?.classList.add(`hidden`),this.el.multiplayer.classList.add(`hidden`),this.showMpView(`entry`),this.el.overlay.classList.remove(`hidden`),this.clearMenuWeatherPreview(),this.audio.playMenuMusic(),this.syncMuteBtn()}cancelMpConnect(e){this.expectingLobby=!1,this.inLobby=!1,this.online=!1,this.net.disconnect(),this.clearRemotes(),this.el.netStatus.classList.add(`hidden`),this.showMpView(e),this.syncMuteBtn()}showMpView(e){this.el.mpEntry.classList.toggle(`hidden`,e!==`entry`),this.el.mpCreate.classList.toggle(`hidden`,e!==`create`),this.el.mpJoin.classList.toggle(`hidden`,e!==`join`),this.el.mpLobby.classList.toggle(`hidden`,e!==`lobby`),e===`create`?(this.syncMpCreateKindUi(),this.syncMpCreateWeatherUi(),this.renderMpCreateTracks(),this.mpInviteSelected.clear(),this.refreshMpFriendInviteUi(),this.applyMenuWeatherPreview(this.mpCreateWeather)):e===`lobby`?this.applyMenuWeatherPreview(St(this.net.weather||this.mpCreateWeather)):this.clearMenuWeatherPreview(),this.syncMuteBtn()}setMpCreateKind(e){this.mpCreateKind=e,this.syncMpCreateKindUi()}syncMpCreateKindUi(){document.getElementById(`mp-create-kind-car`)?.classList.toggle(`is-active`,this.mpCreateKind===`car`),document.getElementById(`mp-create-kind-bike`)?.classList.toggle(`is-active`,this.mpCreateKind===`bike`)}setMpCreateWeather(e){this.mpCreateWeather=St(e),this.syncMpCreateWeatherUi(),this.applyMenuWeatherPreview(this.mpCreateWeather)}syncMpCreateWeatherUi(){document.getElementById(`mp-create-weather-dry`)?.classList.toggle(`is-active`,this.mpCreateWeather===`dry`),document.getElementById(`mp-create-weather-rain`)?.classList.toggle(`is-active`,this.mpCreateWeather===`rain`),document.getElementById(`mp-create-weather-night`)?.classList.toggle(`is-active`,this.mpCreateWeather===`night`)}applyMenuWeatherPreview(e){!this.weather||this.running||(this.mpWeatherPreview=!0,this.weather.setParticlesEnabled(!0),this.weather.setMode(St(e)))}clearMenuWeatherPreview(){!this.weather||this.running||(this.mpWeatherPreview=!1,this.weather.setMode(`dry`))}renderMpCreateTracks(){this.renderMapGrid(this.el.mpCreateTrackGrid,this.mpCreateTrackId,e=>{this.mpCreateTrackId=e,this.renderMpCreateTracks()})}setMpFormStatus(e){this.el.mpCreate.classList.contains(`hidden`)||(this.el.mpCreateStatus.textContent=e),this.el.mpJoin.classList.contains(`hidden`)||(this.el.mpJoinStatus.textContent=e)}sanitizeRoomName(e){return e.replace(/[^\w\- ]/g,``).trim().slice(0,24)||`circuit`}profileNameToBoard(e){if(!e)return null;let t=Pc(e);return t===`RACER`?null:t}nostrDisplayName(){if(!_())return null;let e=Gt();return this.profileNameToBoard(e?.displayName||e?.name)}async nostrDisplayNameAsync(){let e=_();if(!e)return null;let t=await b(e.pubkey);return this.profileNameToBoard(t?.displayName||t?.name)}syncMpInviteToggleLabel(){let e=document.getElementById(`mp-send-friends-panel`),t=document.getElementById(`mp-send-friends-toggle`);if(!t)return;if(e&&!e.classList.contains(`hidden`)){t.textContent=`HIDE FRIENDS`;return}let n=this.mpInviteSelected.size;t.textContent=n>0?`INVITE FRIENDS (${n})`:`INVITE FRIENDS`}refreshMpFriendInviteUi(){let e=document.getElementById(`mp-send-friends-wrap`),t=document.getElementById(`mp-send-friends-list`),n=document.getElementById(`mp-send-friends-panel`);if(!e||!t)return;let r=_();if(!r){e.classList.add(`hidden`),n?.classList.add(`hidden`),t.innerHTML=``,this.mpInviteSelected.clear();return}let i=r=>{if(!r.length){e.classList.add(`hidden`),n?.classList.add(`hidden`),t.innerHTML=``,this.mpInviteSelected.clear(),this.syncMpInviteToggleLabel();return}e.classList.remove(`hidden`);let i=new Set(r.map(e=>e.pubkey));for(let e of[...this.mpInviteSelected])i.has(e)||this.mpInviteSelected.delete(e);t.innerHTML=r.map(e=>{let t=this.mpInviteSelected.has(e.pubkey),n=(e.name||`FRIEND`).toUpperCase();return`<button type="button" class="mp-send-friend${t?` is-selected`:``}" data-invite-pk="${e.pubkey}" aria-pressed="${t?`true`:`false`}"><span class="mp-send-friend-name">${rf(n)}</span></button>`}).join(``),this.syncMpInviteToggleLabel()};i(Ut(r.pubkey)),qt(r.pubkey).then(e=>{document.getElementById(`mp-send-friends-list`)===t&&i(e)})}selectedMpInviteFriends(){let e=document.getElementById(`mp-send-friends-list`),t=e?[...e.querySelectorAll(`button.mp-send-friend.is-selected[data-invite-pk]`)].map(e=>(e.dataset.invitePk||``).toLowerCase()).filter(e=>/^[0-9a-f]{64}$/.test(e)):[],n=new Set(t);for(let e of[...this.mpInviteSelected])n.has(e)||this.mpInviteSelected.delete(e);for(let e of t)this.mpInviteSelected.add(e);return[...new Set(t)]}async createMultiplayerRoom(){let e=this.el.mpCreateName.value.trim();if(!e){this.el.mpCreateStatus.textContent=`Enter a racer name`,this.el.mpCreateName.focus();return}let t=Pc(e);this.el.mpCreateName.value=t,wl(t);let n=this.sanitizeRoomName(this.el.mpCreateRoom.value);this.el.mpCreateRoom.value=n;let r=this.el.mpCreatePass.value.slice(0,32),i=Math.max(2,Math.min(6,Number(this.el.mpCreateMax.value)||4));this.el.mpCreateMax.value=String(i);let a;if(this.eventMode){let e=Math.round(Number(document.getElementById(`mp-create-buyin`).value));if(!Number.isFinite(e)||e<1){this.el.mpCreateStatus.textContent=`Enter a buy-in of at least 1 sat`;return}a=Math.min(1e6,e),document.getElementById(`mp-create-buyin`).value=String(a)}let o=this.selectedMpInviteFriends();if(o.length){let e=_(),i=e?o.map(t=>(Ut(e.pubkey).find(e=>e.pubkey===t)?.name||`FRIEND`).toUpperCase()):[];this.el.mpCreateStatus.textContent=`Inviting ${i.join(`, `)||`${o.length} friend(s)`}…`;try{let e=await Kt({room:n,password:r,trackId:this.mpCreateTrackId,fromName:t,friendPubkeys:o});e.sent>0&&(this.showToast(e.sent===1?`Lobby request sent to ${i[0]||`friend`}`:`Lobby request sent to ${e.sent} friends`),this.mpInviteSelected.clear(),this.refreshMpFriendInviteUi()),e.failed.length&&this.showToast(`${e.failed.length} invite${e.failed.length===1?``:`s`} failed`)}catch(e){this.el.mpCreateStatus.textContent=e instanceof Error?e.message:`Could not send invites`;return}}this.el.mpCreateStatus.textContent=`Creating room…`,await this.unlockAudioBounded(),this.audio.stopMenuMusic(),this.garage={...$l(),kind:this.mpCreateKind},this.solo=!1,this.practice=!1,this.clearRemotes(),this.expectingLobby=!0,this.el.netStatus.classList.remove(`hidden`),this.setNetStatus(`Creating room…`,`ok`),this.net.createRoom({name:t,room:n,password:r,maxPlayers:i,trackId:this.mpCreateTrackId,kind:this.mpCreateKind,weather:this.mpCreateWeather,color:this.garage.primary,accent:this.garage.accent,pubkey:_()?.pubkey,eventBuyInSats:a,eventGameMode:this.eventMode?this.eventGameMode:void 0})}setEventGameModePick(e){e===`battle`&&!this.eventMode||(this.eventGameMode=e,this.syncEventGameModePickUi(),this.syncEventBuyInLabel())}syncEventGameModePickUi(){let e=document.getElementById(`mp-event-pick-race`),t=document.getElementById(`mp-event-pick-battle`);e?.classList.toggle(`is-active`,this.eventGameMode===`race`),t?.classList.toggle(`is-active`,this.eventGameMode===`battle`);let n=document.getElementById(`mp-race-mode-hint`);n&&(n.textContent=this.eventGameMode===`battle`?`Money cubes share the pot · race still crowns a winner`:`First to finish 3 laps`)}syncEventBuyInLabel(){let e=document.getElementById(`mp-create-buyin-label`);e&&(e.textContent=this.eventGameMode===`battle`?`Buy-in per racer (real sats) · item boxes share the pot`:`Buy-in per racer (real sats) · winner takes the pot`)}async joinMultiplayerRoom(){let e=this.el.mpJoinName.value.trim();if(!e){this.el.mpJoinStatus.textContent=`Enter a racer name`,this.el.mpJoinName.focus();return}let t=Pc(e);this.el.mpJoinName.value=t,wl(t);let n=this.sanitizeRoomName(this.el.mpJoinRoom.value);this.el.mpJoinRoom.value=n;let r=this.el.mpJoinPass.value.slice(0,32);this.el.mpJoinStatus.textContent=`Joining room…`,await this.unlockAudioBounded(),this.audio.stopMenuMusic(),this.garage=$l(),this.solo=!1,this.practice=!1,this.clearRemotes(),this.expectingLobby=!0,this.el.netStatus.classList.remove(`hidden`),this.setNetStatus(`Joining room…`,`ok`),this.net.joinRoom({name:t,room:n,password:r,color:this.garage.primary,accent:this.garage.accent,pubkey:_()?.pubkey,eventMode:this.eventMode})}async leaveLobby(){let e=this.net.event,t=!!e&&!!this.net.id&&e.paidIds.includes(this.net.id),n=null;this.inLobby&&t&&this.net.connected&&(this.el.mpStatus.textContent=`Refunding buy-in…`,n=await this.net.leaveRoom(4e3)),this.closeMultiplayer(),n&&this.onBuyInRefund(n)}onBuyInRefund(e){if(!e.ok){this.showToast(e.error||`Buy-in refund failed`);return}let t=Math.max(0,Math.round(e.sats||0)),n=String(e.token||``).trim();if(!n){t>0&&this.showToast(`Refunded ${t} sats`);return}this.showToast(`Buy-in refund · ${t} sats — token copied`),navigator.clipboard?.writeText(n).catch(()=>{})}upsertLobbyPlayer(e){let t=this.lobbyPlayers.findIndex(t=>t.id===e.id);t>=0?this.lobbyPlayers[t]=e:this.lobbyPlayers.push(e),this.renderLobby()}pushLobbyNotice(e){if(!this.inLobby)return;let t=document.createElement(`div`);for(t.className=`mp-feed-line`,t.textContent=e,this.el.mpLobbyFeed.appendChild(t),this.el.mpLobbyFeed.scrollTop=this.el.mpLobbyFeed.scrollHeight;this.el.mpLobbyFeed.children.length>12;)this.el.mpLobbyFeed.firstElementChild?.remove()}showToast(e){let t=document.getElementById(`toast-stack`);if(!t)return;let n=String(e||``).trim();if(!n)return;for(;t.children.length>=3;)t.firstElementChild?.remove();let r=document.createElement(`div`);r.className=`toast`,r.setAttribute(`role`,`status`),r.textContent=n,t.appendChild(r),setTimeout(()=>r.classList.add(`toast-out`),2800),setTimeout(()=>r.remove(),3300)}notify(e){this.showToast(e)}isInRace(){return this.running&&!this.finished}renderLobby(){let e=Oa(this.net.trackId||this.mpCreateTrackId).name,t=this.net.kind===`bike`?`BIKES`:`CARS`,n=this.net.weather===`rain`?`RAIN`:this.net.weather===`night`?`NIGHT`:`DRY`,r=this.net.event,i=(this.net.raceMode||r?.mode||`race`)===`battle`?`BATTLE`:`RACE`;this.el.mpLobbyTitle.textContent=this.net.room.toUpperCase(),this.el.mpLobbyMeta.textContent=`${e} · ${i} · ${t} · ${n} · ${this.lobbyPlayers.length}/${this.net.maxPlayers}`,this.el.mpLobbyPlayers.innerHTML=this.lobbyPlayers.map(e=>{let t=e.id===this.net.hostId?`HOST`:`RACER`,n=e.id===this.net.id?` (you)`:``,i=e.pubkey?`<span class="board-verified" title="Nostr-signed · ${y(e.pubkey)}">✓</span>`:``,a=r?r.paidIds.includes(e.id)?`<span class="mp-paid-badge">PAID</span>`:`<span class="mp-unpaid-badge">UNPAID</span>`:``;return`<li><span class="mp-name-row"><span class="mp-swatch" style="background:${`#${(e.color>>>0).toString(16).padStart(6,`0`)}`}"></span><span>${rf(e.name)}${n}${i}</span></span><span class="mp-role">${t}${a}</span></li>`}).join(``);let a=document.getElementById(`mp-buyin`);if(a&&a.classList.toggle(`hidden`,!r),r){(r.mode===`battle`||r.mode===`race`)&&(this.eventGameMode=r.mode);let e=document.getElementById(`mp-buyin-banner`);if(e){let t=r.feeSats??0,n=r.mode===`battle`?`BATTLE · `:`RACE · `,i=r.mode===`battle`?` · BOXES SHARE THE POT`:``;e.textContent=t?`${n}BUY-IN ${r.buyInSats} SATS + ${t} SAT MINT FEE · POT ${r.buyInSats*this.lobbyPlayers.length} SATS${i}`:`${n}BUY-IN ${r.buyInSats} SATS · POT ${r.buyInSats*this.lobbyPlayers.length} SATS${i}`}let t=r.paidIds.includes(this.net.id),n=document.getElementById(`mp-invoice-box`);n&&n.classList.toggle(`is-paid`,t);let i=document.getElementById(`mp-invoice-status`);i&&t&&(i.textContent=`PAID ✓`,i.classList.add(`is-paid`)),document.getElementById(`mp-lobby-leave`)?.classList.remove(`hidden`)}else document.getElementById(`mp-lobby-leave`)?.classList.remove(`hidden`);let o=this.net.isHost,s=r?this.lobbyPlayers.filter(e=>r.paidIds.includes(e.id)).length:0,c=r?this.lobbyPlayers.filter(e=>!r.paidIds.includes(e.id)).map(e=>e.name):[],l=!r||this.lobbyPlayers.length>0&&s===this.lobbyPlayers.length;this.el.mpStartBtn.classList.toggle(`hidden`,!o),this.el.mpStartBtn.disabled=!o||!l,this.el.mpStartBtn.textContent=`START RACE`;let u=c.length?` — waiting on ${c.join(`, `)}`:``;this.el.mpStatus.textContent=o?l?`All buy-ins paid — start when ready`:`Waiting for buy-ins (${s}/${this.lobbyPlayers.length} paid)${u}`:r?l?`All paid — waiting for host to start…`:`Waiting for buy-ins (${s}/${this.lobbyPlayers.length} paid)${u}`:`Waiting for host to start the race…`}showBuyInInvoice(e,t,n,r,i,a){this.buyInInvoice={paymentRequest:e,bolt11:String(a||``).trim(),amountSats:t,mock:n,buyInSats:r,feeSats:i},this.buyInPayMethod=`cashu`,this.renderBuyInInvoice(),this.renderLobby()}setBuyInPayMethod(e){e===`lightning`&&!this.buyInInvoice?.bolt11||(this.buyInPayMethod=e,this.renderBuyInInvoice())}renderBuyInInvoice(){let e=this.buyInInvoice,t=document.getElementById(`mp-invoice-box`);if(!t||!e)return;t.classList.remove(`is-paid`);let n=this.buyInPayMethod===`lightning`&&!!e.bolt11,r=n?e.bolt11:e.paymentRequest;document.getElementById(`mp-invoice-pay-tabs`)?.classList.toggle(`hidden`,e.mock||!e.bolt11),document.getElementById(`mp-pay-cashu`)?.classList.toggle(`is-active`,!n),document.getElementById(`mp-pay-ln`)?.classList.toggle(`is-active`,n);let i=document.getElementById(`mp-invoice-bolt11`);i&&(i.value=r,i.setAttribute(`aria-label`,n?`Lightning invoice`:`Cashu payment request`));let a=document.getElementById(`mp-invoice-copy`);a&&(a.textContent=n?`COPY INVOICE`:`COPY REQUEST`);let o=document.getElementById(`mp-invoice-status`);o&&(o.textContent=e.mock?`Dev mode — auto-pays in a few seconds`:n?`Pay ${e.amountSats} sats over Lightning — minted as Cashu on Cubabitcoin`:e.feeSats?`Pay ${e.amountSats} sats (${e.buyInSats} buy-in + ${e.feeSats} mint fee) — cashu.me`:`Scan with cashu.me — real Bitcoin sats`,o.classList.remove(`is-paid`));let s=document.getElementById(`mp-token-input`);s&&(s.value=``,s.placeholder=e.mock?`cashuA…`:`cashuA token of ${e.amountSats} sats from Cubabitcoin…`);let c=document.getElementById(`mp-invoice-qr`);if(c){let e=/^(lnbc|creqb)/i.test(r)?r.toUpperCase():r;Dd().then(t=>t.toDataURL(e,{width:168,margin:1,errorCorrectionLevel:`M`}).then(e=>{c.src=e,c.alt=n?`Lightning invoice QR code`:`Cashu payment request QR code`}).catch(()=>void 0))}}submitBuyInToken(){let e=document.getElementById(`mp-token-input`)?.value.trim()??``;if(!e)return;let t=document.getElementById(`mp-invoice-status`);t&&(t.textContent=`Checking token…`),this.net.submitToken(e)}copyBuyInInvoice(){let e=document.getElementById(`mp-invoice-bolt11`),t=document.getElementById(`mp-invoice-copy`);!e||!t||navigator.clipboard.writeText(e.value).then(()=>{t.textContent=`COPIED ✓`,setTimeout(()=>{t.textContent=this.buyInPayMethod===`lightning`?`COPY INVOICE`:`COPY REQUEST`},1500)}).catch(()=>e.select())}eventPotBreakdown(e){let t=e.potSats||e.buyInSats*Math.max(1,this.lobbyPlayers.length);return{pot:t,fee:Math.min(t,Math.max(0,e.potFeeSats??0))}}setupEventCheckout(e){let t=e.mode===`battle`,n=this.net.id,r=t?Math.max(0,Math.round(e.battleClaimable?.[n]??e.battleEarnings?.[n]??0)):0,i=!!e.battleClaimedIds?.includes(n),a=document.getElementById(`event-checkout-title`);a&&(a.textContent=t?`YOUR SHARE`:`POT WON`);let o=document.getElementById(`event-battle-summary`);if(o)if(t){let t=Math.max(0,Math.round(e.battleEarnings?.[n]??0));o.textContent=r>0?`Battle haul ${t} sats in cubes · claim ${r} sats`:`No cubes collected — nothing to claim`,o.classList.remove(`hidden`)}else o.classList.add(`hidden`),o.textContent=``;let s=t?r:this.eventPotBreakdown(e).pot,c=document.getElementById(`event-pot-sats`);c&&(c.textContent=String(s));let l=document.getElementById(`event-tip-range`);l&&(l.value=`2`);let u=document.getElementById(`event-payout-status`);u&&u.classList.add(`hidden`),document.getElementById(`event-token-box`)?.classList.add(`hidden`);let d=document.getElementById(`event-payout-token`);d&&(d.value=``),this.clearPayoutTokenQr();let f=document.getElementById(`event-claim-btn`);f&&(f.textContent=t?`CLAIM SHARE`:`CLAIM POT`,f.disabled=s<=0||i),this.updateEventTipBreakdown()}updateEventTipBreakdown(){let e=this.net.event;if(!e)return;let t=e.mode===`battle`,n=this.net.id,{pot:r,fee:i}=this.eventPotBreakdown(e),a=t?Math.max(0,Math.round(e.battleClaimable?.[n]??e.battleEarnings?.[n]??0)):r,o=t?Math.min(a,Math.round(i/Math.max(1,Object.values(e.battleClaimable??{}).filter(e=>e>0).length||1))):i,s=t?a:r,c=document.getElementById(`event-tip-range`),l=Math.max(0,Math.min(100,Number(c?.value??2))),u=document.getElementById(`event-tip-label`);u&&(u.textContent=`${l}%`);let d=Math.floor(s*l/100),f=Math.min(d,Math.max(0,s-o)),p=Math.max(0,s-f-o),m=document.getElementById(`event-winner-sats`);m&&(m.textContent=String(p));let h=document.getElementById(`event-tip-sats`);h&&(h.textContent=String(f));let g=document.getElementById(`event-fee-part`);g&&g.classList.toggle(`hidden`,o<=0);let _=document.getElementById(`event-fee-sats`);_&&(_.textContent=String(o));let v=Math.max(1,this.lobbyPlayers.length),y=e.buyInSats||0,b=e.feeSats??0,x=(e,t)=>{let n=document.getElementById(e);n&&(n.textContent=t)};x(`event-sched-n`,String(v)),x(`event-sched-pay`,String(y+b)),x(`event-sched-buyin`,String(y)),x(`event-sched-infee`,String(b)),x(`event-sched-pot`,String(t?s:r)),x(`event-sched-tip`,String(f)),x(`event-sched-you`,String(p)),x(`event-sched-outfee`,String(o)),document.getElementById(`event-sched-infee-row`)?.classList.toggle(`hidden`,b<=0);let S=document.getElementById(`event-tip-guilt`);S&&S.classList.toggle(`hidden`,l>=2)}claimEventPot(){let e=document.getElementById(`event-payout-status`),t=document.getElementById(`event-claim-btn`),n=Number(document.getElementById(`event-tip-range`).value);if(!e)return;e.classList.remove(`hidden`,`nostr-error`),e.textContent=`Sending your sats…`,t&&(t.disabled=!0);let r=document.getElementById(`event-payout-token`);r&&(r.value=``),document.getElementById(`event-token-box`)?.classList.add(`hidden`),this.clearPayoutTokenQr(),this.net.claimPot(n)}onPayoutResult(e){let t=document.getElementById(`event-payout-status`),n=document.getElementById(`event-claim-btn`);if(t)if(t.classList.remove(`hidden`),e.ok){t.classList.remove(`nostr-error`);let r=e.tipSats?e.tipCollected?` · ${e.tipSats} sats tip auto-collected`:` · ${e.tipSats} sats dev tip`:``,i=e.feeSats?` · mint fee taken from the pot`:``,a=String(e.token||``).trim();t.textContent=a?`Paid! ${e.winnerSats} sats${r}${i} — scan the QR or paste the token into cashu.me`:`Paid! ${e.winnerSats} sats${r}${i}`,n&&(n.disabled=!0);let o=document.getElementById(`event-payout-token`);o&&(o.value=a),a?(document.getElementById(`event-token-box`)?.classList.remove(`hidden`),this.renderPayoutTokenQr(a)):(document.getElementById(`event-token-box`)?.classList.add(`hidden`),this.clearPayoutTokenQr())}else t.classList.add(`nostr-error`),t.textContent=`Payout failed — ${e.error||`unknown error`}`,n&&(n.disabled=!1),this.clearPayoutTokenQr()}async renderPayoutTokenQr(e){let t=document.getElementById(`event-payout-qr`),n=document.getElementById(`event-payout-qr-wrap`),r=document.getElementById(`event-payout-qr-note`),i=document.getElementById(`event-token-hint`);if(!t)return;let a=e.trim();if(!a){this.clearPayoutTokenQr();return}let o=a.startsWith(`cashu:`)?a:`cashu:${a}`,s=(e,t)=>{r&&(r.textContent=e,r.classList.toggle(`hidden`,!t))},c=e=>{i&&(i.textContent=e)};try{let e=await Dd(),r=e.create(o,{errorCorrectionLevel:`L`}).modules.size,i=4,l=(r+4)*i;if(l>640&&(i=3,l=(r+4)*i),l>640)throw Error(`qr too dense for display`);let u=await e.toDataURL(o,{scale:i,margin:2,errorCorrectionLevel:`L`});if(document.getElementById(`event-payout-token`)?.value!==a)return;t.src=u,t.width=l,t.height=l,t.alt=`Cashu payout token QR code`,n?.classList.remove(`hidden`),s(``,!1),c(`Scan with cashu.me, or Receive → paste the token`)}catch{if(document.getElementById(`event-payout-token`)?.value!==a)return;this.clearPayoutTokenQr(),s(`Token is too long for a QR — use COPY TOKEN instead`,!0),c(`Receive → paste the token into cashu.me`);let e=document.getElementById(`event-payout-status`);e&&!e.classList.contains(`nostr-error`)&&(e.textContent=e.textContent?.replace(` — scan the QR or paste the token into cashu.me`,` — copy the token and paste it into cashu.me`)??e.textContent)}}clearPayoutTokenQr(){let e=document.getElementById(`event-payout-qr`),t=document.getElementById(`event-payout-qr-wrap`),n=document.getElementById(`event-payout-qr-note`),r=document.getElementById(`event-token-hint`);e&&(e.removeAttribute(`src`),e.alt=`Cashu payout token QR code`),t?.classList.add(`hidden`),n&&(n.textContent=``,n.classList.add(`hidden`)),r&&(r.textContent=`Scan with cashu.me, or Receive → paste the token`)}async unlockAndMaybeMenuMusic(){await this.unlockAudioBounded(),this.onHomeOrBoard()&&this.audio.playMenuMusic()}openMapSelect(){this.el.leaderboard.classList.add(`hidden`),this.el.garage.classList.add(`hidden`),this.el.multiplayer.classList.add(`hidden`),document.getElementById(`dev-dash`)?.classList.add(`hidden`),this.el.mapSelectTitle.textContent=`TEST DRIVE`,this.el.mapSelectTagline.textContent=`Choose a circuit`,this.renderMapGrid(this.el.mapGrid,null,e=>{this.bootFromMenu({practice:!0,trackId:e})}),this.el.overlay.classList.add(`hidden`),this.el.mapSelect.classList.remove(`hidden`),this.syncMuteBtn()}closeMapSelect(){this.el.mapSelect.classList.add(`hidden`),this.el.overlay.classList.remove(`hidden`),this.syncMuteBtn()}renderMapGrid(e,t,n){let r=e.getAttribute(`role`)===`tablist`;e.innerHTML=``;for(let i of ya){let a=document.createElement(`button`);a.type=`button`,a.className=`map-thumb`,a.setAttribute(`role`,r?`tab`:`option`),a.setAttribute(`aria-label`,i.name),a.setAttribute(`aria-selected`,t===i.id?`true`:`false`),r&&(a.tabIndex=t===i.id?0:-1),t===i.id&&a.classList.add(`selected`);let o=document.createElement(`canvas`);a.appendChild(o),a.onclick=()=>n(i.id),e.appendChild(a),requestAnimationFrame(()=>{ms(o,i.id,{selected:t===i.id})})}}setActiveTrack(e,t){let n=!!t?.menu,r=Math.max(.5,t?.widthScale??1);this.trackId===e&&this.track.id===e&&this.menuScenery===n&&this.trackWidthScale===r||(this.disposeWildlife(),$o(this.track),this.track=Qo(e,{sceneryScale:n?Nd:1,widthScale:r}),this.trackId=this.track.id,this.boardTrackId=this.track.id,this.menuScenery=n,this.trackWidthScale=r,this.scene.add(this.track.group),this.weather?.setTrackRoot(this.track.group),n||this.syncWildlife(),this.minimapPath=null,this.minimapPts=[],this.minimapTrackKey=``,this.stickyT=new WeakMap)}syncWildlife(){this.disposeWildlife();let e=this.online?this.onlineAnimalSeed:td(String(Math.random())),t=nd.createForTrack(this.track.id,this.track.path,e);t&&(this.wildlife=t,this.scene.add(t.group))}disposeWildlife(){this.wildlife?.dispose(),this.wildlife=null}updateWildlife(e){if(!this.wildlife||!this.player)return;if(this.player.mesh.userData.kind===`bird`){this.wildlife.update(e,[],void 0,{halfRate:this.perf.wildlifeHalfRate});return}let t=this._wildlifePack;if(t.length=0,t.push(this.player),!this.online&&!this.solo)for(let e of this.rivals)e.disabledUntil>0||t.push(e.vehicle);let n=this.online&&this.raceStart>0&&!this.gridHeld?(this.raceNow()-this.raceStart)/1e3:-1,r={halfRate:this.perf.wildlifeHalfRate};if(n>=0){this.wildlife.syncShared(n,e,t,e=>{this.audio.playBoom(),e.target===this.player&&this.showAnimalHit(e.name)},r);return}this.wildlife.update(e,t,e=>{this.audio.playBoom(),e.target===this.player&&this.showAnimalHit(e.name)},r)}showAnimalHit(e){let t=this.el.animalHit;t.textContent=`${e}!`,t.classList.add(`hidden`),t.style.animation=`none`,requestAnimationFrame(()=>{t.classList.remove(`hidden`),t.style.animation=``}),this.animalHitUntil=performance.now()+1200}updateAnimalHit(){this.animalHitUntil<=0||performance.now()>=this.animalHitUntil&&(this.animalHitUntil=0,this.el.animalHit.classList.add(`hidden`))}hideAnimalHit(){this.animalHitUntil=0,this.el.animalHit.classList.add(`hidden`)}async bootFromMenu(e={}){try{await this.unlockAudioBounded(),this.audio.stopMenuMusic(),this.online=!1,this.net.disconnect(),this.clearRemotes(),this.el.netStatus.classList.add(`hidden`),this.el.leaderboard.classList.add(`hidden`),this.el.mapSelect.classList.add(`hidden`),this.el.garage.classList.add(`hidden`),this.el.multiplayer.classList.add(`hidden`),document.getElementById(`dev-dash`)?.classList.add(`hidden`),Jt(),r(),n(),document.getElementById(`home-settings`)?.classList.add(`hidden`),document.getElementById(`feedback-compose`)?.classList.add(`hidden`),document.getElementById(`nostr-login`)?.classList.add(`hidden`),this.startRace(e)}catch(e){this.notify(e instanceof Error?e.message:`Could not start the race`)}}async unlockAudioBounded(){await Promise.race([this.audio.unlock(),new Promise(e=>setTimeout(e,700))])}goHome(){this.running=!1,this.finished=!1,this.paused=!1,this.practice=!1,this.solo=!1,this.online=!1,this.inLobby=!1,this.expectingLobby=!1,this.expectingSpectate=!1;let e=this.roomSpectating;this.roomSpectating=!1,this.preferredSpectateTargetId=null,this.lobbyPlayers=[],this.onlineFinishPending=!1,this.stopSpectate(),this.clearBattleCubes(),this.net.disconnect(),this.clearRemotes(),this.disposeGhost(),this.el.netStatus.classList.add(`hidden`),this.pauseTotal=0,this.pauseBegan=0,this.clearCountdown(),this.clearExplode(!0),this.clearOnlineWreck(),this.hideAnimalHit(),this.resetWallHits(),this.resetMapVote(),this.audio.mute(),this.audio.stopRaceAudio(),this.input.clearDriveKeys(),this.el.pause.classList.add(`hidden`),this.el.finish.classList.add(`hidden`),this.el.pauseBtn.classList.add(`hidden`),this.el.wrongWay.classList.add(`hidden`),this.el.explodeFlash.classList.add(`hidden`),this.el.animalHit.classList.add(`hidden`),this.el.nameEntry.classList.add(`hidden`),this.el.leaderboard.classList.add(`hidden`),this.el.mapSelect.classList.add(`hidden`),this.el.garage.classList.add(`hidden`),this.el.multiplayer.classList.add(`hidden`),document.getElementById(`dev-dash`)?.classList.add(`hidden`),this.el.mpLobbyFeed.innerHTML=``,this.el.minimap.classList.add(`hidden`),this.el.rearview.classList.add(`hidden`),this.syncTouchControls(),this.el.overlay.classList.remove(`hidden`),this.mpWeatherPreview=!1,this.weather.setMode(`dry`),this.setActiveTrack(wa,{menu:!0}),this.applyGarageToWorld(),this.player&&(this.player.reset(this.track.startPosition.clone(),this.track.startHeading),this.resetSticky(this.player),this.player.mesh.visible=!0),this.setAiVisible(!1),this.weather.placeSun(this.track.startPosition,{snap:!0}),this.shadowNeedsWarmup=!0,this.audio.playMenuMusic(),this.syncMuteBtn(),ct(this.player?.mesh,!1),e&&this.openDevDash()}renderBoardList(e){if(!e.length){this.el.boardList.innerHTML=`<li class="empty">No times yet — be the first</li>`;return}this.el.boardList.innerHTML=e.map((e,t)=>{let n=t===0?`top1`:t===1?`top2`:t===2?`top3`:``,r=e.pubkey?`<span class="board-verified" title="Nostr-signed · ${y(e.pubkey)}">✓</span>`:``;return`<li class="${n}"><span class="rank">${t+1}</span><span class="name">${rf(e.name)}${r}</span><span class="time">${Sl(e.timeMs)}</span></li>`}).join(``)}async openLeaderboard(){this.el.mapSelect.classList.add(`hidden`),this.el.garage.classList.add(`hidden`),this.el.multiplayer.classList.add(`hidden`),document.getElementById(`social-hub`)?.classList.add(`hidden`),document.getElementById(`dev-dash`)?.classList.add(`hidden`),this.el.leaderboard.classList.remove(`hidden`);let e=document.getElementById(`board-eyebrow`);e&&(e.textContent=`WORLDWIDE · ${new Date().getFullYear()}`),this.boardTrackId=this.trackId||wa,this.el.boardSource.textContent=`Loading…`,this.el.boardList.innerHTML=``,this.renderBoardTrackPicker(),await this.loadBoardForTrack(this.boardTrackId),this.syncMuteBtn()}async devAccessAllowed(){let e=_();return e?(this.devPubkeyFetched||(this.devPubkeyFetched=!0,this.devPubkey=await Ol()),this.devPubkey===null||e.pubkey===this.devPubkey):!1}async refreshDevAccess(){let e=document.getElementById(`dev-btn`);if(!e)return;let t=await this.devAccessAllowed();e.classList.toggle(`hidden`,!t),this.syncGarageDevKinds(t)}syncGarageDevKinds(e){document.getElementById(`garage-kind-bird`)?.classList.toggle(`hidden`,!e),!e&&Ql(this.garage.kind)&&(this.garage.kind=`car`),this.el.garage.classList.contains(`hidden`)||this.syncGarageUi()}openDevDash(){this.el.mapSelect.classList.add(`hidden`),this.el.leaderboard.classList.add(`hidden`),this.el.garage.classList.add(`hidden`),this.el.multiplayer.classList.add(`hidden`),this.el.overlay.classList.add(`hidden`),document.getElementById(`dev-dash`)?.classList.remove(`hidden`),this.syncMuteBtn(),this.renderDevActivity([]),this.renderDevDash(),this.startDevLiveFeed()}closeDevDash(){this.stopDevLiveFeed(),document.getElementById(`dev-dash`)?.classList.add(`hidden`),this.el.overlay.classList.remove(`hidden`),this.syncMuteBtn()}startDevLiveFeed(){this.stopDevLiveFeed(),this.refreshDevLiveFeed(),this.devLivePollTimer=setInterval(()=>{if(document.getElementById(`dev-dash`)?.classList.contains(`hidden`)){this.stopDevLiveFeed();return}this.refreshDevLiveFeed()},4e3)}stopDevLiveFeed(){this.devLivePollTimer!=null&&(clearInterval(this.devLivePollTimer),this.devLivePollTimer=null),this.devLivePollInFlight=!1}async refreshDevLiveFeed(){if(!this.devLivePollInFlight){this.devLivePollInFlight=!0;try{let e=await Ht();this.renderDevLiveFeed(e)}catch{let e=document.getElementById(`dev-live-status`);e&&(e.textContent=`Live feed unavailable`)}finally{this.devLivePollInFlight=!1}}}renderDevLiveFeed(e){let t=document.getElementById(`dev-live-status`),n=document.getElementById(`dev-live-feed`);if(!n)return;let r=e.online??[],i=e.rooms??[],a=e.racing??i.reduce((e,t)=>e+(t.players||0),0),o=e.now;if(t&&!this.expectingSpectate&&(t.textContent=`${[`${o} tab${o===1?``:`s`}`,`${r.length} signed-in`,`${a} in rooms`].join(` · `)} · ${e.source} · click a racer to watch live`),n.innerHTML=``,!r.length&&!i.length){let e=document.createElement(`p`);e.className=`dev-tip-empty`,e.textContent=`No players online right now.`,n.appendChild(e);return}let s=new Map,c=new Map;for(let e of i)for(let t of e.racers||[]){let n={room:e.room,id:t.id,name:t.name};t.pubkey&&s.set(t.pubkey.toLowerCase(),n);let r=t.name.toLowerCase();c.set(r,c.has(r)?null:n)}if(i.length)for(let e of i)n.appendChild(this.buildDevLiveRoomBlock(e));else{let e=document.createElement(`p`);e.className=`dev-tip-empty`,e.textContent=`No active multiplayer rooms — players must be in Multiplayer / Event Mode to watch.`,n.appendChild(e)}if(r.length){let e=_()?.pubkey?.toLowerCase()||``,t=document.createElement(`div`);t.className=`dev-live-block`;let i=document.createElement(`div`);i.className=`dev-live-block-title`,i.innerHTML=`<span><span class="dev-live-dot" aria-hidden="true"></span>SIGNED IN</span><span class="dev-live-phase">${r.length}</span>`,t.appendChild(i);let a=document.createElement(`p`);a.className=`dev-live-meta`,a.textContent=`Click a name that is IN ROOM to chase-cam their race`,t.appendChild(a);let o=document.createElement(`ul`);o.className=`dev-live-racers`;for(let t of r){let n=document.createElement(`li`),r=document.createElement(`span`);r.className=`dev-live-name`;let i=(t.pubkey||``).toLowerCase(),a=(t.name||``).trim(),l=(!a||/^racer$/i.test(a)||/^nostr racer$/i.test(a))&&i?y(i):a||(i?y(i):`RACER`);i&&i===e&&(l=`${l} · YOU`),r.textContent=l;let u=document.createElement(`span`);u.className=`dev-live-kind`;let d=i&&s.get(i)||c.get((t.name||``).toLowerCase())||null;d?(u.textContent=`WATCH`,n.classList.add(`is-watchable`),n.title=`Watch ${d.name} live`,n.addEventListener(`click`,()=>{this.beginDevSpectate(d.room,d.id,d.name)})):u.textContent=`ONLINE`,n.append(r,u),o.appendChild(n)}t.appendChild(o),n.appendChild(t)}}buildDevLiveRoomBlock(e){let t=document.createElement(`div`);t.className=`dev-live-block`;let n=document.createElement(`div`);n.className=`dev-live-block-title`;let r=document.createElement(`span`),i=document.createElement(`span`);i.className=`dev-live-dot`,i.setAttribute(`aria-hidden`,`true`),r.append(i,document.createTextNode(e.room));let a=document.createElement(`span`);a.className=`dev-live-phase`,a.textContent=(e.phase||`lobby`).toUpperCase(),n.append(r,a),t.appendChild(n);let o=document.createElement(`p`);o.className=`dev-live-meta`;let s=e.trackId?Oa(e.trackId).name:`—`,c=e.eventMode&&e.eventMode!==`race`?` · ${e.eventMode}`:``;o.textContent=`${e.players}/${e.maxPlayers} · ${s}${c} · click name to watch`,t.appendChild(o);let l=document.createElement(`ul`);l.className=`dev-live-racers`;let u=e.racers?.length?e.racers:Array.from({length:e.players},(e,t)=>({id:String(t),name:`Player ${t+1}`,kind:`car`}));for(let t of u){let n=document.createElement(`li`),r=document.createElement(`span`);r.className=`dev-live-name`;let i=(t.name||``).trim(),a=!i||/^racer$/i.test(i)||/^nostr racer$/i.test(i),o=t.pubkey,s=a&&o?y(o):i||(o?y(o):`RACER`);r.textContent=s;let c=document.createElement(`span`);c.className=`dev-live-kind`,c.textContent=`WATCH`,n.append(r,c),n.classList.add(`is-watchable`),n.title=`Watch ${s} live`,n.addEventListener(`click`,n=>{n.preventDefault(),n.stopPropagation(),this.beginDevSpectate(e.room,t.id,s)}),l.appendChild(n)}return t.appendChild(l),t}async beginDevSpectate(e,t,n){let r=document.getElementById(`dev-live-status`),i=e=>{r&&(r.textContent=e),this.setNetStatus(e,/fail|error|not |Could|Sign/i.test(e)?`bad`:`ok`)},a=_();if(!a){i(`Sign in with the DEV account to watch`);return}if(!await this.devAccessAllowed()){i(`DEV account required to watch live`);return}let o;try{o=await Al(a.signer)}catch(e){i(`Could not sign watch auth — ${e instanceof Error?e.message:e}`);return}this.expectingLobby=!1,this.expectingSpectate=!0,this.roomSpectating=!1,this.preferredSpectateTargetId=t||null,this.online=!1,this.inLobby=!1,this.net.disconnect(),i(`Connecting to watch ${n} in ${e}…`),this.net.spectateRoom({room:e,targetId:t,event:o})}async renderDevDash(){let e=document.getElementById(`dev-status`),t=_();if(!t){e&&(e.textContent=`Sign in with your dev account`),this.renderDevActivity([],`Sign in with the DEV account to load activity.`);return}e&&(e.textContent=`Loading…`);try{let[e,n]=await Promise.all([Ml(t.signer),Ll(t.signer)]);this.renderDevSummary(e),this.renderDevFeedback(n)}catch(n){let r=n instanceof Error&&/not configured/.test(n.message)?`Server has no DEV_PUBKEY yet — set it to your pubkey: ${t.pubkey}`:`Could not load tips — ${n instanceof Error?n.message:n}`;e&&(e.textContent=r),this.renderDevActivity([],r)}}renderDevFeedback(e){let t=document.getElementById(`dev-feedback-list`),n=document.getElementById(`dev-feedback-toggle`);if(!t)return;t.innerHTML=``;let r=e.filter(e=>!e.read),i=e.filter(e=>e.read),a=this.devShowReadFeedback?e:r;if(a.length===0){let e=document.createElement(`li`);e.className=`dev-tip-empty`,e.textContent=this.devShowReadFeedback?`No feedback yet — player messages land here.`:`Inbox zero — nothing unread.`,t.appendChild(e)}for(let e of a){let n=document.createElement(`li`);n.className=`dev-tip dev-feedback${e.read?` is-read`:``}`;let r=new Date(e.createdAt).toLocaleString(`en-US`,{month:`short`,day:`numeric`,hour:`2-digit`,minute:`2-digit`}),i=document.createElement(`span`);i.className=`dev-tip-info dev-feedback-info`;let a=document.createElement(`span`);a.className=`dev-feedback-meta`,a.textContent=`${r}${e.name?` · ${e.name}`:``}`;let o=document.createElement(`span`);o.className=`dev-feedback-text`,o.textContent=e.text,i.append(a,o),n.appendChild(i);let s=document.createElement(`span`);if(s.className=`dev-tip-side`,!e.read){let t=document.createElement(`button`);t.type=`button`,t.className=`dev-tip-copy`,t.textContent=`READ`,t.title=`Dismiss — hides this message`,t.onclick=()=>void this.devFeedbackAction(`read`,e.id),s.appendChild(t)}let c=document.createElement(`button`);c.type=`button`,c.className=`dev-tip-mark dev-feedback-delete`,c.textContent=`✕`,c.title=`Delete permanently`,c.onclick=()=>void this.devFeedbackAction(`delete`,e.id),s.appendChild(c),n.appendChild(s),t.appendChild(n)}n&&(n.classList.toggle(`hidden`,i.length===0),n.textContent=this.devShowReadFeedback?`Hide read (${i.length})`:`Show read (${i.length})`,n.onclick=()=>{this.devShowReadFeedback=!this.devShowReadFeedback,this.refreshDevFeedback()})}async refreshDevFeedback(){let e=_();if(e)try{this.renderDevFeedback(await Ll(e.signer))}catch{}}async devFeedbackAction(e,t){let n=_();if(n)try{let r=e===`read`?await Rl(n.signer,t):await zl(n.signer,t);this.renderDevFeedback(r)}catch(e){let t=document.getElementById(`dev-status`);t&&(t.textContent=`Could not update — ${e instanceof Error?e.message:e}`)}}renderDevSummary(e){let t=document.getElementById(`dev-status`);t&&(t.textContent=`${e.mint.replace(/^https?:\/\//,``)} · signed in as dev`),document.getElementById(`dev-wallet`)?.classList.remove(`hidden`);let n=(e,t)=>{let n=document.getElementById(e);n&&(n.textContent=String(t))},r=e.walletSats??e.pendingSats;n(`dev-pending-sats`,r),n(`dev-earned-sats`,e.earnedSats),n(`dev-count`,e.count),n(`dev-claimed-sats`,e.withdrawnSats??e.claimedSats),this.renderDevEvents(e.events||[]),this.renderDevActivity(e.activity||[]);let i=document.getElementById(`dev-tip-audit`);i&&(i.textContent=this.formatWalletAudit(e.custody?.tip,null));let a=(e.events||[]).find(e=>e.rescueToken),o=a?.rescueToken||e.custody?.tip?.rescueToken||``,s=a?.orphaned?a.mintUrl:e.custody?.tip?.orphaned?e.custody.tip.mintUrl:``,c=document.getElementById(`dev-orphan-box`),l=document.getElementById(`dev-orphan-token`),u=document.getElementById(`dev-orphan-hint`);o?(c?.classList.remove(`hidden`),l&&(l.value=o),u&&(u.textContent=`Unspent proofs on disk from ${s.replace(/^https?:\/\//,``)} — add that mint in cashu.me, then paste once.`)):(c?.classList.add(`hidden`),l&&(l.value=``));let d=e.pendingWithdraw,f=document.getElementById(`dev-withdraw-box`),p=document.getElementById(`dev-withdraw-token`);d?.token?(f?.classList.remove(`hidden`),p&&(p.value=d.token)):(f?.classList.add(`hidden`),p&&(p.value=``));let m=document.getElementById(`dev-tips-list`);if(m){m.innerHTML=``;let t=e.tips.filter(e=>!e.claimed);if(t.length===0){let t=document.createElement(`li`);t.className=`dev-tip-empty`,t.textContent=e.tips.some(e=>e.claimed)?`Claimed tips have left this wallet.`:`No tips yet — they land in this wallet when winners share the pot.`,m.appendChild(t)}for(let e of t){let t=document.createElement(`li`);t.className=`dev-tip`;let n=new Date(e.at).toLocaleString(`en-US`,{month:`short`,day:`numeric`,hour:`2-digit`,minute:`2-digit`}),r=document.createElement(`span`);r.className=`dev-tip-info`,r.textContent=`${n} · ${e.room||`event`} · pot ${e.potSats} → `;let i=document.createElement(`strong`);i.textContent=`${e.tipSats} sats`,r.appendChild(i),t.appendChild(r);let a=document.createElement(`span`);a.className=`dev-tip-side`;let o=!e.mock&&!e.collected&&e.tipSats>0,s=e.claimed===!0,c=document.createElement(`span`);if(c.className=`dev-tip-badge ${e.mock?`is-mock`:s?`is-claimed`:e.collected?`is-collected`:o?`is-failed`:`is-pending`}`,c.textContent=e.mock?`TEST`:s?`CLAIMED`:e.collected?`IN WALLET`:o?`FAILED`:`PENDING`,o?c.title=`Tip never reached the tip wallet — retry to collect it`:s?c.title=`Withdrawn — this tip has left the server wallet`:e.collected&&(c.title=`Still in the tip wallet — withdraw to cashu.me`),a.appendChild(c),o){let t=document.createElement(`button`);t.type=`button`,t.className=`dev-tip-copy`,t.textContent=`RETRY`,t.title=`Collect this tip into the tip wallet`,t.onclick=()=>void this.retryTip(e.at),a.appendChild(t)}t.appendChild(a),m.appendChild(t)}}let h=r>0&&!d?.token;document.getElementById(`dev-withdraw-btn`)?.classList.toggle(`hidden`,!h),document.getElementById(`dev-claim-all`)?.classList.toggle(`hidden`,!d?.token)}renderDevEvents(e){let t=document.getElementById(`dev-events-empty`),n=document.getElementById(`dev-event-table-wrap`),r=document.getElementById(`dev-event-rows`);if(r){r.replaceChildren(),t?.classList.toggle(`hidden`,e.length>0),n?.classList.toggle(`hidden`,e.length===0);for(let t of e){let e=document.createElement(`tr`);e.className=`dev-event-row`,t.leftover&&e.classList.add(`is-leftover`),t.error&&e.classList.add(`is-error`);let n=document.createElement(`td`);n.className=`dev-event-name`;let i=document.createElement(`strong`);if(i.textContent=t.name||`event`,n.appendChild(i),t.potId&&t.potId!==`legacy`){let e=document.createElement(`span`);e.className=`dev-event-id`,e.textContent=t.potId.slice(0,8),e.title=t.potId,n.appendChild(e)}e.appendChild(n);let a=document.createElement(`td`);a.textContent=[t.live?t.phase:`offline`,t.potClaimed?`claimed`:``,t.orphaned?`other mint`:``].filter(Boolean).join(` · `),e.appendChild(a);let o=document.createElement(`td`);o.textContent=t.live?`${t.paid}/${t.players}`:`—`,e.appendChild(o);let s=document.createElement(`td`);s.textContent=t.live?String(t.potSats):String(t.localSats),e.appendChild(s);let c=document.createElement(`td`);c.textContent=[String(t.unspentSats),t.spentSats?`${t.spentSats} spent`:``,t.pendingSats?`${t.pendingSats} pending`:``,t.error||``].filter(Boolean).join(` · `),e.appendChild(c),r.appendChild(e);let l=document.createElement(`tr`);l.className=`dev-event-log-row`;let u=document.createElement(`td`);u.colSpan=5;let d=document.createElement(`details`);d.className=`dev-event-logs`;let f=document.createElement(`summary`),p=t.logs||[],m=p[p.length-1];if(f.textContent=m?`${p.length} log${p.length===1?``:`s`} · ${m.msg}`:`no log yet`,d.appendChild(f),p.length){let e=document.createElement(`ol`);for(let t of p){let n=document.createElement(`li`);n.className=`dev-event-log is-${t.level}`;let r=t.at?new Date(t.at).toLocaleString(`en-US`,{month:`short`,day:`numeric`,hour:`2-digit`,minute:`2-digit`,second:`2-digit`}):``;n.textContent=r?`${r} · ${t.msg}`:t.msg,e.appendChild(n)}d.appendChild(e)}u.appendChild(d),l.appendChild(u),r.appendChild(l)}}}ensureDevActivityList(){let e=document.getElementById(`dev-activity-list`);if(e)return e;let t=document.querySelector(`#dev-dash .dev-panel`);if(!t)return null;let n=document.createElement(`p`);n.className=`eyebrow dev-section-title`,n.textContent=`ACTIVITY`,e=document.createElement(`ol`),e.id=`dev-activity-list`,e.className=`dev-tips-list dev-activity-list`,e.setAttribute(`aria-label`,`Game and payment log`);let r=document.getElementById(`dev-wallet`),i=document.getElementById(`dev-events-box`),a=r||i?.nextSibling||null;return a?(t.insertBefore(n,a),t.insertBefore(e,a)):t.append(n,e),e}renderDevActivity(e,t){let n=this.ensureDevActivityList();if(n){if(n.replaceChildren(),e.length===0){let e=document.createElement(`li`);e.className=`dev-tip-empty`,e.textContent=t||`No activity yet — games and payments land here.`,n.appendChild(e);return}for(let t of e){let e=document.createElement(`li`),r=t.level===`error`||t.ok===!1,i=!r&&t.level===`warn`;e.className=`dev-tip dev-activity is-${t.type}`,i&&e.classList.add(`is-warn`),r&&e.classList.add(`is-error`);let a=t.at?new Date(t.at).toLocaleString(`en-US`,{month:`short`,day:`numeric`,hour:`2-digit`,minute:`2-digit`,second:`2-digit`}):``,o=document.createElement(`span`);r?(o.className=`dev-activity-badge is-error`,o.textContent=`ERR`):i?(o.className=`dev-activity-badge is-warn`,o.textContent=`WARN`):(o.className=`dev-activity-badge is-${t.type}`,o.textContent=t.type===`payment`?`PAY`:`GAME`);let s=document.createElement(`span`);s.className=`dev-tip-info`,s.textContent=[a,t.room,t.detail].filter(Boolean).join(` · `),e.append(o,s),n.appendChild(e)}}}formatWalletAudit(e,t){return t&&!e?t:!e||!e.file&&!e.proofs&&!e.localSats?`empty on this server · mint has nothing for us`:[`${e.unspentSats} unspent at mint`,e.spentSats?`${e.spentSats} spent`:``,e.pendingSats?`${e.pendingSats} pending`:``,e.error?e.error:``].filter(Boolean).join(` · `)||`checked mint`}copyDevOrphanToken(){let e=document.getElementById(`dev-orphan-token`),t=document.getElementById(`dev-orphan-copy`),n=e?.value.trim()??``;!n||!t||navigator.clipboard.writeText(n).then(()=>{t.textContent=`COPIED ✓`,setTimeout(()=>t.textContent=`COPY RESCUE TOKEN`,1500)}).catch(()=>e?.select())}async withdrawDevWallet(){let e=_();if(!e)return;let t=document.getElementById(`dev-status`);t&&(t.textContent=`Withdrawing…`);try{let t=await Fl(e.signer);this.renderDevSummary(t)}catch(e){t&&(t.textContent=`Could not withdraw — ${e instanceof Error?e.message:e}`)}}copyDevWithdrawToken(){let e=document.getElementById(`dev-withdraw-token`),t=document.getElementById(`dev-withdraw-copy`),n=e?.value.trim()??``;!n||!t||navigator.clipboard.writeText(n).then(()=>{t.textContent=`COPIED ✓`,setTimeout(()=>t.textContent=`COPY TOKEN`,1500)}).catch(()=>e?.select())}async claimDevTip(e){let t=_();if(!t)return;let n=document.getElementById(`dev-status`);n&&(n.textContent=`Updating…`);try{let e=await Nl(t.signer);this.renderDevSummary(e)}catch(e){n&&(n.textContent=`Could not update — ${e instanceof Error?e.message:e}`)}}async retryTip(e){let t=_();if(!t)return;let n=document.getElementById(`dev-status`);n&&(n.textContent=`Collecting tip…`);try{let n=await Pl(t.signer,e);this.renderDevSummary(n)}catch(e){n&&(n.textContent=`Retry failed — ${e instanceof Error?e.message:e}`)}}renderBoardTrackPicker(){this.renderMapGrid(this.el.boardTrackGrid,this.boardTrackId,e=>{e!==this.boardTrackId&&(this.boardTrackId=e,this.renderBoardTrackPicker(),this.loadBoardForTrack(e))})}async loadBoardForTrack(e){let t=++this.boardLoadGen;this.el.boardSource.textContent=`Loading…`;let{entries:n,source:r}=await vl(e);t!==this.boardLoadGen||e!==this.boardTrackId||(this.el.boardSource.textContent=Cl(r),this.renderBoardList(n))}async saveDriverScore(){let e=_();if(!e||this.scoreSaveInFlight)return;if(!this.el.driverName.value.trim()){this.el.driverName.focus();return}let t=Pc(this.el.driverName.value);this.el.driverName.value=t;let n=document.getElementById(`submit-score-btn`);this.scoreSaveInFlight=!0,n.disabled=!0;try{let{entries:n,source:r}=await xl(t,this.pendingFinishMs,this.bestLap,this.trackId,e.signer);wl(t),this.el.nameEntry.classList.add(`hidden`),this.boardTrackId=this.trackId,this.el.leaderboard.classList.remove(`hidden`),this.renderBoardTrackPicker(),this.el.boardSource.textContent=Cl(r,!0),this.renderBoardList(n)}finally{this.scoreSaveInFlight=!1,n.disabled=!1}}onNetWelcome(e){if(e.spectator){if(!this.expectingSpectate){this.net.disconnect();return}this.expectingSpectate=!1,this.online=!0,this.inLobby=!1,this.roomSpectating=!0,this.lobbyPlayers=[...e.players],e.spectateTargetId&&(this.preferredSpectateTargetId=e.spectateTargetId);let t=e.kind===`bike`||e.you.kind===`bike`?`bike`:`car`;this.garage={...$l(),kind:t},this.net.kind=t,this.net.weather=St(e.weather),e.raceMode&&(this.net.raceMode=e.raceMode),this.stopDevLiveFeed(),document.getElementById(`dev-dash`)?.classList.add(`hidden`),this.el.overlay.classList.add(`hidden`),this.el.multiplayer.classList.add(`hidden`),this.el.netStatus.classList.remove(`hidden`),this.setNetStatus(e.phase===`lobby`?`Waiting for race · ${e.room}`:`Watching · ${e.room}`,`ok`),this.syncMuteBtn();return}if(!this.expectingLobby){this.net.disconnect();return}this.expectingLobby=!1,this.online=!0,this.inLobby=!0,this.lobbyPlayers=[...e.players];let t=e.kind===`bike`||e.you.kind===`bike`?`bike`:`car`;this.garage={...$l(),kind:t,primary:e.you.color||this.garage.primary,accent:e.you.accent??this.garage.accent},this.net.kind=t,this.net.weather=St(e.weather),e.raceMode&&(this.net.raceMode=e.raceMode),(e.raceMode===`battle`||e.raceMode===`race`)&&(this.eventGameMode=e.raceMode),this.setNetStatus(`Lobby · ${e.room}`,`ok`),this.el.overlay.classList.add(`hidden`),this.el.mpLobbyFeed.innerHTML=``,this.showMpView(`lobby`),this.el.multiplayer.classList.remove(`hidden`),this.renderLobby(),this.pushLobbyNotice(`Welcome to ${e.room}`),this.syncMuteBtn()}beginOnlineRace(e,t,n,r){if(!this.online)return;this.inLobby=!1,this.el.multiplayer.classList.add(`hidden`),this.el.overlay.classList.add(`hidden`);let i=t===`bike`||this.net.kind===`bike`||this.garage.kind===`bike`?`bike`:`car`;this.garage={...this.garage,kind:i},this.net.kind=i;let a=mt(n,mt(this.net.weather,this.mpCreateWeather));this.disposeVehicleMesh(this.player);let o=Ve(i,this.garage.primary,7,this.garage.accent,{headlights:!0});this.scene.add(o),this.player=new Rs(o,this.track.startPosition.clone(),this.track.startHeading,!0),this.setAiVisible(!1),this.clearRemotes();for(let e of this.lobbyPlayers)!this.roomSpectating&&e.id===this.net.id||this.spawnRemote({...e,kind:i});this.setNetStatus(this.roomSpectating?`Watching · ${this.net.room}`:`Racing · ${this.net.room}`,`ok`),this.startRace({trackId:e||this.net.trackId||this.trackId,weather:a}),this.setupBattleCubes(r),this.roomSpectating&&(this.player.mesh.visible=!1,this.preferredSpectateTargetId=this.preferredSpectateTargetId||this.net.spectateTargetId||null,this.spectateTargetId=this.preferredSpectateTargetId,this.enterSpectate())}onNetState(e,t=performance.now()){if(this.gridHeld)return;let n=this.seenRemoteIds;n.clear();let r=this.net.kind===`bike`?`bike`:`car`;for(let i of e){if(i.id===this.net.id)continue;if(n.add(i.id),i.kind=r,i.wrecked&&this.wreckedIds.add(i.id),this.net.peerPoseFresh(i.id)){i.wrecked&&this.remotes.get(i.id)?.setOnFire();continue}let e=this.remotes.get(i.id);e?e.push(i,t):(this.spawnRemote(i),this.remotes.get(i.id)?.push(i,t)),i.wrecked&&this.remotes.get(i.id)?.setOnFire()}for(let e of this.remotes.keys())n.has(e)||this.removeRemote(e)}onNetPeerPose(e,t){if(this.gridHeld||e.id===this.net.id)return;e.kind=this.net.kind===`bike`?`bike`:`car`;let n=this.remotes.get(e.id);n?n.push(e,t):(this.spawnRemote(e),this.remotes.get(e.id)?.push(e,t))}spawnRemote(e){if(e.id===this.net.id||this.remotes.has(e.id))return;let t=new mc(e,this.scene,this.labelRoot);qe(t.mesh),this.remotes.set(e.id,t),this.wreckedIds.has(e.id)&&t.setOnFire()}removeRemote(e){let t=this.remotes.get(e);t&&(this.resetSticky(t),t.dispose(this.scene),this.remotes.delete(e),this.spectating&&this.spectateTargetId===e&&(this.cycleSpectateTarget(1)||this.exitSpectate()))}clearRemotes(){for(let e of this.remotes.values())this.resetSticky(e),e.dispose(this.scene);this.remotes.clear(),this.spectating&&this.stopSpectate()}disposeGhost(){this.ghostPlayer?.dispose(),this.ghostPlayer=null,this.ghostRecorder.reset()}ghostAllowed(){return!this.ghostEnabled||this.online||this.roomSpectating?!1:this.solo&&!this.practice}spawnGhostFromBest(){if(this.ghostPlayer?.dispose(),this.ghostPlayer=null,!this.ghostAllowed())return;let e=vd(this.player?.mesh.userData.kind??this.garage.kind);if(!e)return;let t=xd(this.trackId,e);t&&(this.ghostPlayer=new Ed(this.scene,e,this.garage.primary,this.garage.accent,t,this.track.path),this.ghostPlayer.setVisible(!0))}clearGhostRecords(){Cd(),this.disposeGhost(),this.notify(`Ghost times cleared`)}sampleGhostPose(){if(!this.ghostAllowed()||!this.player||this.gridHeld||this.finished||this.exploding||this.onlineWrecked||this.godMode||!vd(this.player.mesh.userData.kind))return;let e=this.raceNow()-this.raceStart;if(e<0)return;let t=this.player.state.position;this.ghostRecorder.push(e,t.x,t.z,this.player.mesh.rotation.y,this.player.mesh.rotation.z)}commitGhostIfBest(e){if(!this.ghostAllowed()||this.godMode)return;let t=vd(this.player?.mesh.userData.kind??this.garage.kind);if(!t)return;let n=this.ghostRecorder.snapshot();n.length<2||wd({trackId:this.trackId,kind:t,timeMs:e,samples:n})}setAiVisible(e){for(let t of this.rivals)t.vehicle.mesh.visible=e}setNetStatus(e,t=`ok`){let n=``;if(this.net.latency>0){n=` · ${Math.round(this.net.latency)}ms`;let e=0;for(let t of this.remotes.values())e=Math.max(e,t.jitter);e>=1&&(n+=` · ±${Math.round(e)}ms`)}this.el.netStatus.textContent=e+n,this.el.netStatus.classList.remove(`hidden`,`warn`,`bad`),t===`warn`&&this.el.netStatus.classList.add(`warn`),t===`bad`&&this.el.netStatus.classList.add(`bad`)}buildWorld(){this.scene.add(this.track.group);let e=new ve(16777215,4874304,.9),t=new H(16777215,.4),n=new E(16774630,1.85);n.position.set(40,80,20),n.castShadow=this.perf.shadows,n.shadow.mapSize.set(this.perf.shadowMapSize,this.perf.shadowMapSize),n.shadow.radius=this.perf.softShadows?4.5:1,n.shadow.bias=-15e-5,n.shadow.normalBias=.035;let r=this.perf.shadowFrustum;n.shadow.camera.near=1,n.shadow.camera.far=220,n.shadow.camera.left=-r,n.shadow.camera.right=r,n.shadow.camera.top=r,n.shadow.camera.bottom=-r,n.shadow.camera.updateProjectionMatrix(),this.sunLight=n,this.scene.add(e),this.scene.add(t),this.scene.add(n),this.scene.add(n.target),this.weather=new W(this.renderer,this.scene,{hemi:e,ambient:t,sun:n}),this.weather.setTrackRoot(this.track.group),this.weather.setMode(`dry`),this.applyPerfSettings(this.qualityTier,{force:!0})}applyGameSettings(e){this.effectsLevel=e.effects,this.ghostEnabled=e.ghost,this.audio.setMasterVolume(a(e.sound));let t=sd()?`low`:s(e.graphics);this.applyPerfSettings(t,{force:!0}),this.ghostPlayer?.setVisible(this.ghostAllowed()),this.ghostAllowed()&&!this.ghostPlayer&&this.running&&!this.gridHeld&&this.spawnGhostFromBest()}applyPerfSettings(e,t){if(!t?.force&&e===this.qualityTier)return;this.qualityTier=e,this.perf=od(e),this.perfThrottle=e!==`high`||this.effectsLevel===`low`,this.renderer.shadowMap.enabled=this.perf.shadows,this.renderer.shadowMap.type=this.perf.softShadows?2:0,this.renderer.setPixelRatio(Math.min(devicePixelRatio,this.perf.maxPixelRatio));let n=this.sunLight;if(n){n.castShadow=this.perf.shadows;let e=this.perf.shadowMapSize;(n.shadow.mapSize.x!==e||n.shadow.mapSize.y!==e)&&(n.shadow.map?.dispose(),n.shadow.map=null,n.shadow.mapSize.set(e,e)),n.shadow.radius=this.perf.softShadows?4.5:1;let t=this.perf.shadowFrustum;n.shadow.camera.left=-t,n.shadow.camera.right=t,n.shadow.camera.top=t,n.shadow.camera.bottom=-t,n.shadow.camera.updateProjectionMatrix()}this.camera.far=this.perf.cameraFar,this.camera.updateProjectionMatrix(),this.rearCamera.far=Math.min(400,this.perf.cameraFar),this.rearCamera.updateProjectionMatrix(),this.weather?.setLightBudget({nightLampRange:this.perf.nightLampRange,maxNightLamps:this.perf.maxNightLamps,headlightBeams:this.perf.headlightBeams}),(!this.perf.engineSmoke||this.effectsLevel===`low`)&&this.clearEngineSmoke(),this.shadowNeedsWarmup=!0}spawnPose(e,t){let n=(e%1+1)%1,r=this.track.path.getPointAt(n),i=this.track.path.getTangentAt(n).normalize(),a=new I(-i.z,0,i.x),o=Math.atan2(i.x,i.z);return{pos:r.clone().addScaledVector(a,t),heading:o,tan:i}}sortedOnlineIds(){let e=this.lobbyPlayers.map(e=>e.id);return this.net.id&&!e.includes(this.net.id)&&e.push(this.net.id),[...new Set(e)].sort()}onlineGridSlot(e,t){let n=Math.min(Math.max(1,t),Yd),r=(e%n+n)%n,i=Math.floor(Math.max(0,e)/n),a=Math.min(n,Math.max(1,t-i*n)),o=a===1?0:-3.4+r*Jd*2/(a-1);return{t:Xd-i*Zd,offset:o}}snapOnlineStartingGrid(){if(!this.online||!this.player)return;let e=this.sortedOnlineIds(),t=performance.now(),n=e.indexOf(this.net.id);if(n>=0){let t=this.onlineGridSlot(n,e.length),{pos:r,heading:i}=this.spawnPose(t.t,t.offset);this.player.reset(r,i),this.player.state.speed=0,this.player.state.steerAngle=0,this.player.syncCollision(),this.resetSticky(this.player),this.lastT=this.projectSticky(this.player,this.player.state.position).t}for(let[n,r]of this.remotes){let i=e.indexOf(n);if(i<0)continue;let a=this.lobbyPlayers.find(e=>e.id===n),o=this.onlineGridSlot(i,e.length),{pos:s,heading:c}=this.spawnPose(o.t,o.offset);r.snap({id:n,name:r.name,color:a?.color??15002354,accent:a?.accent,kind:this.net.kind===`bike`?`bike`:`car`,x:s.x,z:s.z,h:c,s:0,g:`1`,lap:1},t)}}disposeVehicleMesh(e){e&&(e===this.player&&(this.clearEngineSmoke(),this.localWreckFire?.dispose(),this.localWreckFire=null),this.scene.remove(e.mesh),Ue(e.mesh))}applyGarageToWorld(e=!1){let t=$l();Sa(this.trackId)&&(t.kind=`car`);let n=this.player?.mesh.userData.kind??null,r=this.player?.mesh.userData.bodyColor??null,i=this.player?.mesh.userData.accentColor??null,a=!e&&this.player&&this.rivals.length===at.rivals.length&&n===t.kind&&r===t.primary&&i===t.accent;if(this.garage=t,a)return;this.disposeGhost();let o=this.garage.kind,s=this.player?.state.position.clone()??this.track.startPosition.clone(),c=this.player?.state.heading??this.track.startHeading;this.disposeVehicleMesh(this.player);for(let e of this.rivals)this.disposeVehicleMesh(e.vehicle);let l=Ve(o,this.garage.primary,7,this.garage.accent,{headlights:!0});this.scene.add(l),this.player=new Rs(l,s,c,!0),this.rivals=at.rivals.map((e,t)=>{let n=qd[t+1]??qd[qd.length-1],r=at.rivalAccents[t]??15791352,i=Ve(Ql(o)?`car`:o,e,11+t*3,r);this.scene.add(i);let{pos:a,heading:s}=this.spawnPose(n.t,n.offset);return new Bs(new Rs(i,a,s,!1),n.offset,n.skill,t)})}spawnVehicles(){this.applyGarageToWorld()}startRace(e={}){this.practice=!!e.practice,this.solo=!!e.solo&&!this.online,!this.online&&this.garage.kind===`bird`&&(this.practice=!0,this.solo=!1);let t=e.trackId??this.trackId??wa,n=this.online&&(this.net.event?.mode===`battle`||this.eventGameMode===`battle`);this.setActiveTrack(t,{menu:!1,widthScale:n?_c:1}),this.online||this.applyGarageToWorld(),this.setAiVisible(!this.solo&&!this.online),this.el.overlay.classList.add(`hidden`),this.el.mapSelect.classList.add(`hidden`),this.el.multiplayer.classList.add(`hidden`),this.el.garage.classList.add(`hidden`),this.el.finish.classList.add(`hidden`),this.el.pause.classList.add(`hidden`),this.el.leaderboard.classList.add(`hidden`),this.el.nameEntry.classList.add(`hidden`),this.hideAnimalHit(),this.resetMapVote(),this.el.pauseBtn.classList.remove(`hidden`),this.el.finishEyebrow.textContent=`SESSION COMPLETE`,this.el.finishTitle.textContent=`FINISH`,this.el.finalPlace.textContent=this.solo?`1/1`:`1/6`,this.finished=!1,this.onlineFinishPending=!1,this.pendingFinishMs=0,this.stopSpectate(),this.disposeGhost(),this.paused=!1,this.running=!0,this.syncTouchControls(),this.lap=1,this.bestLap=1/0,this.sectorRef=this.loadSectorRef(),this.sectorIdx=0,this.sectorStartMs=0,this.el.delta.textContent=``,this.hideAnimalHit(),this.pauseTotal=0,this.pauseBegan=0,this.raceStart=0,this.lapStart=0,this.input.clearDriveKeys(),this.clearExplode(!0),this.clearOnlineWreck(),this.resetWallHits(),this.mpWeatherPreview=!1,this.weather.setTrackRoot(this.track.group),this.weather.setParticlesEnabled(!0);let r=this.online?St(e.weather??this.net.weather):Ql(this.garage.kind)||Sa(this.trackId)?`dry`:ze();if(this.online&&(this.net.weather=r),this.weather.setMode(r),this.online)this.snapOnlineStartingGrid();else{let e=this.practice?{t:ef,offset:tf}:this.solo?{t:Qd,offset:$d}:qd[0],{pos:t,heading:n}=this.spawnPose(e.t,e.offset);this.player.reset(t,n),this.player.mesh.userData.kind===`bird`&&(this.player.state.position.y=14,this.player.syncCollision()),this.resetSticky(this.player),this.lastT=this.projectSticky(this.player,this.player.state.position).t}this.weather.placeSun(this.player.state.position,{snap:!0}),this.shadowNeedsWarmup=!0,this.crossedOnce=!0,this.gates.reset(),this.el.wrongWay.classList.add(`hidden`),this.snapCamera(),!this.online&&!this.solo&&this.rivals.forEach((e,t)=>{let n=qd[t+1]??qd[qd.length-1],{pos:r,heading:i}=this.spawnPose(n.t,e.racingOffset);e.vehicle.reset(r,i),e.vehicle.state.speed=0,e.disabledUntil=0,this.resetSticky(e.vehicle),e.resetProgress()}),this.el.lap.innerHTML=this.practice?`1`:`1<span>/${jd}</span>`,this.el.best.textContent=`--:--.---`,this.el.gear.textContent=`1`,this.el.time.textContent=Od(0);let i=this.renderer.domElement;i.tabIndex=0,i.focus({preventScroll:!0}),this.audio.stopRaceAudio(),this.audio.unmute(),this.syncMuteBtn(),this.warmRacePresentation(),Ql(this.garage.kind)&&!this.online||this.roomSpectating?(this.clearCountdown(),this.releaseGrid()):this.beginCountdown()}warmRacePresentation(){if(!this.player)return;let e=this._lampMeshes;e.length=0;for(let t of this.rivals)t.vehicle.mesh.visible&&e.push(t.vehicle.mesh);if(this.weather.update(0,this.player.state.position,this.player.state.heading,!0,this.player.mesh,{particles:this.weather.mode===`rain`,lampMeshes:e}),!this.online&&!this.solo)for(let e of this.rivals)e.warmLine(this.track.path);this.spawnGhostFromBest(),this.perf.engineSmoke&&this.effectsLevel!==`low`&&(this.ensureEngineSmoke(),this.engineSmoke&&(this.engineSmoke.visible=!1));let t=!(Ql(this.garage.kind)&&!this.online||this.roomSpectating);this.scene.updateMatrixWorld(!0),this.renderer.shadowMap.needsUpdate=!0,this.renderer.compile(this.scene,this.camera),this.renderer.render(this.scene,this.camera),this.shadowNeedsWarmup=!1,t&&this.ghostPlayer?.setVisible(!1)}beginCountdown(){this.countdownIndex=0,this.countdownStepAt=performance.now(),this.showCountdownStep(Md[0])}clearCountdown(){this.countdownIndex=-1,this.el.countdown.classList.add(`hidden`),this.el.countdown.classList.remove(`go`),this.el.countdown.textContent=``}showCountdownStep(e){let t=this.el.countdown;t.setAttribute(`translate`,`no`),t.dataset.label=e,t.classList.toggle(`go`,e===`GO`),t.textContent=e,t.classList.remove(`hidden`),t.style.animation=`none`,requestAnimationFrame(()=>{t.dataset.label===e&&(t.style.animation=``)}),this.audio.playCountdown(e)}tickCountdown(e){if(this.countdownIndex<0||e-this.countdownStepAt<Pd)return;if(this.countdownIndex+=1,this.countdownStepAt=e,this.countdownIndex>=Md.length){this.clearCountdown();return}let t=Md[this.countdownIndex];this.showCountdownStep(t),t===`GO`&&this.releaseGrid()}releaseGrid(){if(this.raceStart=this.raceNow(),this.lapStart=this.raceStart,this.sectorIdx=0,this.sectorStartMs=this.raceStart,this.startRaceDriveAudio(),this.ghostRecorder.reset(),this.ghostPlayer?.setVisible(!0),!this.online&&!this.solo)for(let e of this.rivals)e.vehicle.state.speed=5}startRaceDriveAudio(){this.audio.stopMenuMusic()}tickDriveAudio(e){if(!this.player||this.onlineWrecked||this.finished){this.audio.stopDriveEngine();return}let t=this.player.mesh.userData.kind;if(t===`bird`){this.audio.stopDriveEngine();return}let n=t===`bike`?`bike`:`car`;this.audio.updateDriveEngine(n,this.player.state.speed,e,this.player.state.gear)}get countingDown(){return this.countdownIndex>=0}get gridHeld(){return this.countdownIndex>=0&&this.countdownIndex<Md.length-1}pause(){if(!this.running||this.finished||this.paused||this.exploding)return;if(this.spectating){this.exitSpectate();return}this.paused=!0,this.pauseBegan=performance.now(),this.input.clearDriveKeys(),this.audio.mute(),this.audio.stopRaceAudio();let e=this.el.pause.querySelector(`.tagline`);e&&(e.textContent=this.onlineWrecked?`Out of the race · home to leave`:`Race frozen · press Esc to resume`),this.el.pause.classList.remove(`hidden`),this.el.pauseBtn.classList.add(`hidden`),this.syncTouchControls(),this.syncMuteBtn()}resume(){if(!this.paused)return;let e=performance.now()-this.pauseBegan;this.pauseTotal+=e,this.countingDown&&(this.countdownStepAt+=e),this.paused=!1,this.audio.unmute(),!this.gridHeld&&!this.onlineWrecked&&!this.finished&&this.startRaceDriveAudio(),this.el.pause.classList.add(`hidden`),this.el.pauseBtn.classList.remove(`hidden`),this.syncTouchControls(),this.syncMuteBtn(),this.lastFrame=performance.now(),this.input.clearDriveKeys(),this.renderer.domElement.focus({preventScroll:!0}),(this.onlineWrecked||this.onlineFinishPending)&&this.enterSpectate()}projectSticky(e,t){let n=this.stickyT.get(e),r=n===void 0?ss(this.track.path,t):cs(this.track.path,t,n);return this.stickyT.set(e,r.t),r}resetSticky(e){this.stickyT.delete(e)}raceNow(){let e=this.paused?performance.now()-this.pauseBegan:0;return performance.now()-this.pauseTotal-e}updatePerfThrottle(e){}onResize(){this.viewport=Ms();let{w:e,h:t}=this.viewport;this.renderer.setPixelRatio(Math.min(devicePixelRatio,this.perf.maxPixelRatio)),this.camera.aspect=e/Math.max(1,t),this.camera.updateProjectionMatrix(),this.renderer.setSize(e,t),this.rearLayoutKey=``}frame(){let e=performance.now();if(document.visibilityState===`hidden`){this.lastFrame=e;return}let t=e-this.lastFrame,n=Math.min(t/1e3,.05);if(this.lastFrame=e,this.phonePad.setScreen(this.running&&!this.finished&&!this.paused?`drive`:`menu`),this.fpsEmaMs+=(Math.min(t,100)-this.fpsEmaMs)*.05,this.updatePerfThrottle(e),this.remotes.size>0){let t=this.renderer.domElement.clientWidth,n=this.renderer.domElement.clientHeight;for(let r of this.remotes.values())r.update(e,this.camera,t,n)}this.ghostPlayer&&this.running&&this.raceStart>0&&!this.gridHeld&&this.ghostPlayer.update(this.raceNow()-this.raceStart);let r=this.input.getState();if(this.birdLookDown=this.player?.mesh.userData.kind===`bird`&&r.lookDown,this.wantRearview=!1,r.pause&&(this.spectating?this.exitSpectate():this.paused?this.resume():this.running&&!this.finished&&!this.exploding&&this.pause()),this.spectating){let e=r.jump;e&&!this.spectateJumpHeld&&this.cycleSpectateTarget(1),this.spectateJumpHeld=e}else this.spectateJumpHeld=!1;if(this.running&&!this.paused&&(!this.finished||this.online)){if(this.exploding)this.updateExplode(n),this.updateCamera(n),performance.now()>=this.explodeRestartAt&&this.startRace({practice:this.practice,solo:this.solo,trackId:this.trackId});else if(this.countingDown&&this.tickCountdown(e),this.gridHeld)this.updateHud(),this.updateCamera(n);else{let t=r;if(this.finished&&this.online||this.onlineWrecked||this.roomSpectating){let e=this._coastInput;e.pause=r.pause,e.fire=!1,t=e}t.reset&&!this.onlineWrecked&&!this.roomSpectating&&(this.player.reset(this.track.startPosition.clone(),this.track.startHeading),this.player.mesh.userData.kind===`bird`&&(this.player.state.position.y=14,this.player.syncCollision()),this.resetSticky(this.player),this.lastT=this.projectSticky(this.player,this.player.state.position).t,this.gates.reset(),this.sectorIdx=0,this.sectorStartMs=0,this.el.delta.textContent=``,this.el.wrongWay.classList.add(`hidden`),this.snapCamera());let i=this.launchPower(),a=this.godMode&&this.trackId===Gd?Kd:1;this.player.powerMul=i*a;let o=i*(this.godMode?Wd:1)*a;for(let e of this.rivals)e.godBoost=o;if(this.player.update(n,t),(this.onlineWrecked||this.roomSpectating)&&(this.player.state.speed=0,this.player.state.steerAngle=0,this.player.syncCollision()),this.sampleGhostPose(),this.localWreckFire?.update(n),this.tickDriveAudio(t.throttle),this.onlineWrecked||this.roomSpectating)this.player.syncCollision();else if(this.player.mesh.userData.kind===`bird`)this.clampBirdToWorld(),this.projectSticky(this.player,this.player.state.position);else{let e=this.keepOnTrack(this.player);this.notePlayerWallHit(e,n)}if(!this.online&&!this.solo){let t=this.stickyT.get(this.player)??this.projectSticky(this.player,this.player.state.position).t,r=this.fillPack();for(let i of this.rivals)i.update(n,this.track.path,t,e*.001,r),this.keepOnTrack(i.vehicle);if(!this.practice)for(let e of this.rivals)!e.raceDone&&e.laps>=jd&&e.markRaceDone();this.resolveCollisions()}else this.online&&(this.remotes.size>0&&(this.net.maybeSendPose(n,{x:this.player.state.position.x,z:this.player.state.position.z,h:this.player.state.heading,s:this.onlineWrecked?0:this.player.state.speed,g:this.player.gearLabel,lap:this.lap}),this.onlineWrecked||(this.resolveRemoteCollisions(),this.tickWreckContact(n))),this.pingTimer+=n,this.pingTimer>2&&(this.pingTimer=0,this.net.connected&&this.setNetStatus(`Sats Racer · ${this.net.room}`,`ok`)));this.exploding?this.updateCamera(n):(!this.onlineWrecked&&!this.finished&&this.updateLaps(),this.tickBattleCubes(e*.001),this.updateHud(),this.updateCamera(n))}this.updateWildlife(n),this.onlineWrecked&&this.wreckBannerUntil>0&&e>=this.wreckBannerUntil&&(this.el.explodeFlash.classList.add(`hidden`),this.wreckBannerUntil=0),this.exploding||this.tickEngineSmoke(n),!this.exploding&&this.explodeParts.length>0&&this.updateExplode(n)}else if(this.paused)this.updateCamera(0);else if(!this.running&&!this.finished){let t=e*2e-4,n=this.track.startPosition;this.camera.position.set(n.x+Math.cos(t)*18,7,n.z+Math.sin(t)*18),this.camera.lookAt(n.x,1.2,n.z)}else this.finished&&this.updateCamera(n);if(this.weather){let e=this.running&&(!this.finished||this.onlineFinishPending||this.spectating),t=this.mpWeatherPreview&&!e,r=this.player?.state.position??this.track.startPosition,i=this.player?.state.heading??this.track.startHeading;if(this.spectating&&this.spectateTargetId){let e=this.remotes.get(this.spectateTargetId);e&&(r=e.mesh.position,i=e.mesh.rotation.y)}let a=this._lampMeshes;a.length=0;for(let e of this.rivals)e.vehicle.mesh.visible&&a.push(e.vehicle.mesh);for(let e of this.remotes.values())a.push(e.mesh);this.weather.update(n,r,i,e,this.player?.mesh,{particles:(e||t)&&!this.perfThrottle,lampMeshes:a,preview:t})}this.renderViews()}fillPack(){let e=this._pack;e.length=0,e.push(this.player);for(let t of this.rivals)t.disabledUntil>0||e.push(t.vehicle);return e}renderViews(){let{w:e,h:t}=this.viewport;if(this.renderer.setScissorTest(!1),this.renderer.setViewport(0,0,e,t),this.renderer.autoClear=!0,this.running&&!this.paused&&(!this.finished||this.onlineFinishPending||this.spectating)){this.shadowFrame+=1;let e=this.qualityTier===`high`;this.renderer.shadowMap.needsUpdate=this.shadowNeedsWarmup||e||this.shadowFrame%2==0}else this.renderer.shadowMap.needsUpdate=this.shadowNeedsWarmup;if(this.shadowNeedsWarmup&&=!1,this.renderer.render(this.scene,this.camera),!this.wantRearview||!this.player){this.el.rearview.classList.add(`hidden`),this.rearLayoutKey=``;return}let n=Math.floor(Math.min(220,e*.18)),r=Math.floor(n*.52),i=Math.floor(Math.min(22,e*.02)),a=Math.floor(Math.min(this.touchMode?200:118,t*(this.touchMode?.28:.155))),o=e-n-i,s=a;this.updateRearCamera();let c=n/r;c!==this._rearAspect&&(this._rearAspect=c,this.rearCamera.aspect=c,this.rearCamera.updateProjectionMatrix()),this.renderer.autoClear=!1,this.renderer.clearDepth(),this.renderer.setScissorTest(!0),this.renderer.setScissor(o,s,n,r),this.renderer.setViewport(o,s,n,r),this.renderer.render(this.scene,this.rearCamera),this.renderer.setScissorTest(!1),this.renderer.setViewport(0,0,e,t),this.renderer.autoClear=!0;let l=this.el.rearview;l.classList.remove(`hidden`);let u=`${n}x${r}@${o},${t-r-a}`;this.rearLayoutKey!==u&&(this.rearLayoutKey=u,l.style.width=`${n}px`,l.style.height=`${r}px`,l.style.left=`${o}px`,l.style.top=`${t-r-a}px`,l.style.right=`auto`,l.style.bottom=`auto`)}updateRearCamera(){let e=this.player.state,t=Math.sin(e.heading),n=Math.cos(e.heading);this.rearCamera.position.set(e.position.x-t*.35,1.95+e.position.y,e.position.z-n*.35),this.rearCamera.lookAt(e.position.x-t*28,1.1+e.position.y,e.position.z-n*28)}keepOnTrack(e){let t=this.projectSticky(e,e.state.position),n=e.mesh.userData.kind===`bike`?.35:.55,r=this.track.width/2-n,i=t.distanceFromCenter,a=!1;if(Math.abs(i)>r){a=!0;let n=Math.sign(i);this._wallN.set(-t.tangent.z,0,t.tangent.x),e.state.position.addScaledVector(this._wallN,n*r-i);let o=e.state;if(e===this.player){let e=(Math.cos(o.heading)*this._wallN.x-Math.sin(o.heading)*this._wallN.z)*n;this.lastWallSideCar=Math.sign(e)||1}let s=(Math.sin(o.heading)*this._wallN.x+Math.cos(o.heading)*this._wallN.z)*n;o.speed*s>0&&(o.speed*=1-s*s)}return this.applyTrackGrade(e,t.t),(a||this.track.heightAt)&&e.syncCollision(),a}applyTrackGrade(e,t){let n=this.track.heightAt;if(!n){e.state.position.y=0,e.state.groundPitch=0;return}e.state.position.y=n(t);let r=this.track.gradeAt?.(t)??0;e.state.groundPitch=-Math.atan(r)}notePlayerWallHit(e,t){if(this.practice){this.wallTouching=e;return}if(this.exploding||this.onlineWrecked||this.gridHeld){this.wallTouching=e;return}this.wallHitCooldown=Math.max(0,this.wallHitCooldown-t),e&&!this.wallTouching&&this.wallHitCooldown<=0&&(this.wallHits+=1,this.wallHitCooldown=Rd,this.applyWallDamage(this.wallHits),this.updateWallHitsHud(),this.wallHits>=Fd&&this.triggerExplode()),this.wallTouching=e}resetWallHits(){this.wallHits=0,this.wallTouching=!1,this.wallHitCooldown=0,this.restoreBodywork(),this.updateWallHitsHud()}restoreBodywork(){for(let e of this.damageScuffs)e.removeFromParent();this.damageScuffs.length=0;for(let e of this.damagePanels)e.mesh.rotation.x=e.rx,e.mesh.rotation.z=e.rz;this.damagePanels.length=0,this.damageGlass&&=(this.damageGlass.mat.color.setHex(this.damageGlass.color),this.damageGlass.mat.roughness=this.damageGlass.rough,null),this.damageBodyEmissive&&=(this.damageBodyEmissive.mat.emissiveIntensity=this.damageBodyEmissive.emission,null),this.clearEngineSmoke()}applyWallDamage(e){let t=this.player?.mesh;if(!t)return;let n=t.userData.kind===`bike`,r=n?.32:1.08,i=n?.55:.4,a=n?.9:1.35;if(this.damageScuffs.length<5){let e=new J(this._scuffGeo,this._scuffMat);e.position.set(this.lastWallSideCar*r,i+Math.random()*.22,(Math.random()-.5)*a*2),t.add(e),this.damageScuffs.push(e)}let o=t.userData.bodyMaterial;if(o&&(this.damageBodyEmissive||={mat:o,emission:o.emissiveIntensity},o.emissiveIntensity=Math.max(.02,o.emissiveIntensity-.012)),e>=4)for(let e of[`panel-hood`,`panel-tail`]){if(this.damagePanels.some(t=>t.mesh.name===e))continue;let n=t.getObjectByName(e);n&&(this.damagePanels.push({mesh:n,rx:n.rotation.x,rz:n.rotation.z}),n.rotation.x=n.rotation.x+(e===`panel-hood`?.085:-.07),n.rotation.z=n.rotation.z+(Math.random()<.5?.06:-.06))}if(e>=8&&!this.damageGlass){let e=t.getObjectByName(`glass-front`)?.material;e instanceof U&&(this.damageGlass={mat:e,color:e.color.getHex(),rough:e.roughness},e.color.setHex(9413816),e.roughness=.85)}}engineSmokeOrigin(e){return e===`bike`?{x:0,y:.72,z:.04}:{x:0,y:.9,z:1.12}}smokeTexture(){if(this.engineSmokeTex)return this.engineSmokeTex;let e=document.createElement(`canvas`);e.width=64,e.height=64;let t=e.getContext(`2d`),n=t.createRadialGradient(32,32,2,32,32,30);n.addColorStop(0,`rgba(55,55,55,0.98)`),n.addColorStop(.22,`rgba(40,40,40,0.82)`),n.addColorStop(.55,`rgba(28,28,28,0.45)`),n.addColorStop(1,`rgba(18,18,18,0)`),t.fillStyle=n,t.fillRect(0,0,64,64);let r=new D(e);return r.needsUpdate=!0,this.engineSmokeTex=r,r}clearEngineSmoke(){if(!this.engineSmoke){this.engineSmokeLife=null,this.engineSmokeVel=null;return}this.engineSmoke.removeFromParent(),this.engineSmoke.geometry.dispose();let e=this.engineSmoke.material;e.map=null,e.dispose(),this.engineSmoke=null,this.engineSmokeLife=null,this.engineSmokeVel=null}emitEngineSmokePuff(e,t,n,r){let i=this.player.mesh,a=this.engineSmokeOrigin(String(i.userData.kind??`car`));this._smokeWorld.set(a.x,a.y,a.z),i.updateMatrixWorld(),i.localToWorld(this._smokeWorld);let o=e*3;t[o]=this._smokeWorld.x+(Math.random()-.5)*.48,t[o+1]=this._smokeWorld.y+Math.random()*.18,t[o+2]=this._smokeWorld.z+(Math.random()-.5)*.4;let s=this.player.state.speed,c=Math.abs(s),l=Math.sin(this.player.state.heading),u=Math.cos(this.player.state.heading),d=2.6+c*.15,f=s-Math.sign(s||1)*d,p=1.5+c*.04;n[o]=l*f+(Math.random()-.5)*p,n[o+1]=.55+Math.random()*.7,n[o+2]=u*f+(Math.random()-.5)*p,r[e]=2.2+Math.random()*1.4}ensureEngineSmoke(){if(this.engineSmoke&&this.engineSmoke.parent===this.scene&&(this.engineSmoke.geometry.getAttribute(`position`)?.count??0)===Ld){this.engineSmoke.visible=!0;return}this.clearEngineSmoke();let e=Ld,t=new Float32Array(e*3),n=new Float32Array(e),r=new Float32Array(e*3);for(let i=0;i<e;i++){this.emitEngineSmokePuff(i,t,r,n);let e=Math.random()*.7,a=i*3;t[a]+=r[a]*e,t[a+1]+=r[a+1]*e,t[a+2]+=r[a+2]*e,n[i]=Math.max(.15,n[i]-e*.7)}let i=new Pt;i.setAttribute(`position`,new Ie(t,3));let a=new it(i,new T({map:this.smokeTexture(),color:2763306,size:1.7,transparent:!0,opacity:.9,depthWrite:!1,sizeAttenuation:!0}));a.name=`engine-smoke`,a.frustumCulled=!1,a.renderOrder=3,this.scene.add(a),this.engineSmoke=a,this.engineSmokeLife=n,this.engineSmokeVel=r}tickEngineSmoke(e){if(!this.perf.engineSmoke||this.effectsLevel===`low`){this.engineSmoke&&(this.engineSmoke.visible=!1);return}if(!(this.wallHits===Id&&!this.practice&&!this.exploding&&!this.onlineWrecked)){this.engineSmoke&&(this.engineSmoke.visible=!1);return}this.ensureEngineSmoke();let t=this.engineSmoke,n=this.engineSmokeLife,r=this.engineSmokeVel;if(!t||!n||!r||!this.player)return;let i=t.geometry.getAttribute(`position`),a=i.array,o=Math.min(e,.05),s=Math.exp(-.45*o);for(let e=0;e<n.length;e++){n[e]-=o*(.32+Math.random()*.14);let t=e*3;if(n[e]<=0){this.emitEngineSmokePuff(e,a,r,n);continue}r[t]+=(Math.random()-.5)*3.2*o,r[t+1]+=1.35*o,r[t+2]+=(Math.random()-.5)*3.2*o,r[t]*=s,r[t+1]*=s,r[t+2]*=s,a[t]+=r[t]*o,a[t+1]+=r[t+1]*o,a[t+2]+=r[t+2]*o}i.needsUpdate=!0}updateWallHitsHud(){let e=this.el.wallHits;e.parentElement?.classList.toggle(`hidden`,this.practice),!this.practice&&(e.textContent=`${this.wallHits}/${Fd}`,e.classList.toggle(`warn`,this.wallHits>=6&&this.wallHits<9),e.classList.toggle(`danger`,this.wallHits>=9))}triggerExplode(){if(!(this.exploding||this.onlineWrecked)){if(this.online){this.igniteLocal(`You crashed — on fire`),this.net.reportCrash();return}this.exploding=!0,this.explodeRestartAt=performance.now()+zd,this.player.state.speed=0,this.player.state.steerAngle=0,this.player.syncCollision(),this.player.mesh.visible=!1,this.input.clearDriveKeys(),this.el.wrongWay.classList.add(`hidden`),this.el.explodeFlash.textContent=`DESTROYED`,this.el.explodeFlash.classList.remove(`hidden`),this.syncTouchControls(),this.audio.stopRaceAudio(),this.audio.playExplode(),this.clearEngineSmoke(),this.spawnExplodeFx()}}igniteLocal(e){this.onlineWrecked||!this.player||(this.onlineWrecked=!0,this.net.id&&this.wreckedIds.add(this.net.id),this.player.state.speed=0,this.player.state.steerAngle=0,this.player.syncCollision(),this.player.mesh.visible=!0,this.input.clearDriveKeys(),this.el.wrongWay.classList.add(`hidden`),this.el.explodeFlash.textContent=`ON FIRE`,this.el.explodeFlash.classList.remove(`hidden`),this.wreckBannerUntil=performance.now()+2400,this.syncTouchControls(),this.audio.playExplode(),this.clearEngineSmoke(),this.localWreckFire??=new sc(this.player.mesh,this.scene),e&&this.showToast(e),this.enterSpectate())}clearOnlineWreck(){this.onlineWrecked=!1,this.wreckBannerUntil=0,this.wreckedIds.clear(),this.wreckContactS=0,this.localWreckFire?.dispose(),this.localWreckFire=null;for(let e of this.remotes.values())e.clearFire();this.el.explodeFlash.textContent===`ON FIRE`&&(this.el.explodeFlash.classList.add(`hidden`),this.el.explodeFlash.textContent=`DESTROYED`)}applyOnlineWreck(e,t){if(!(!this.online||!this.running)){if(this.wreckedIds.add(e),e===this.net.id){(this.finished||this.onlineFinishPending)&&(this.finished=!1,this.onlineFinishPending=!1,this.pendingFinishMs=0),this.igniteLocal(this.onlineWrecked?void 0:`You caught fire`);return}this.remotes.get(e)?.setOnFire(),this.showToast(`${t} is on fire`)}}tickWreckContact(e){if(!this.online||this.onlineWrecked||this.finished||this.gridHeld){this.wreckContactS=0;return}let t=!1;for(let e of this.remotes.values()){if(!e.wrecked&&!this.wreckedIds.has(e.id))continue;let n=e.mesh.position.x-this.player.state.position.x,r=e.mesh.position.z-this.player.state.position.z,i=(e.kind===`bike`?1.1:1.7)+this.vehicleRadius(this.player)+1.6;if(n*n+r*r<i*i){t=!0;break}}t?this.wreckContactS+=e:this.wreckContactS=Math.max(0,this.wreckContactS-e*.4),!(this.wreckContactS<3)&&(this.wreckContactS=0,this.igniteLocal(`You caught fire`),this.net.reportCrash())}applyOnlineFieldReset(){if(!this.online||!this.running)return;let e=performance.now();e-this.lastFieldResetAt<1500||(this.lastFieldResetAt=e,this.finished=!1,this.onlineFinishPending=!1,this.pendingFinishMs=0,this.stopSpectate(),this.clearOnlineWreck(),this.resetWallHits(),this.paused=!1,this.el.pause.classList.add(`hidden`),this.el.pauseBtn.classList.remove(`hidden`),this.el.finish.classList.add(`hidden`),this.el.wrongWay.classList.add(`hidden`),this.el.explodeFlash.classList.add(`hidden`),this.el.explodeFlash.textContent=`DESTROYED`,this.lap=1,this.bestLap=1/0,this.hideAnimalHit(),this.pauseTotal=0,this.pauseBegan=0,this.raceStart=0,this.lapStart=0,this.crossedOnce=!0,this.gates.reset(),this.input.clearDriveKeys(),this.el.lap.innerHTML=`1<span>/${jd}</span>`,this.el.best.textContent=`--:--.---`,this.el.time.textContent=Od(0),this.el.gear.textContent=`1`,this.snapOnlineStartingGrid(),this.snapCamera(),this.audio.unmute(),this.beginCountdown(),this.syncTouchControls(),this.syncMuteBtn(),this.showToast(`Everyone is on fire — restarting`))}spawnExplodeFx(){this.clearExplodeParticles();let e=this.player.state.position,t=[16738862,16762967,16726830,16772778,8947848],n=i(this.effectsLevel);for(let r=0;r<n;r++){let n=new ut({color:t[r%t.length],transparent:!0,opacity:1,depthWrite:!1}),i=new J(this._explodeGeo,n);i.position.set(e.x+(Math.random()-.5)*1.2,.6+Math.random()*.8,e.z+(Math.random()-.5)*1.2);let a=8+Math.random()*14,o=new I((Math.random()-.5)*a,4+Math.random()*10,(Math.random()-.5)*a);this.scene.add(i),this.explodeParts.push({mesh:i,vel:o,life:.55+Math.random()*.55})}this.explodeFlashLight&&(this.explodeFlashLight.position.set(e.x,2.2,e.z),this.explodeFlashLight.intensity=this.effectsLevel===`low`?0:o(this.effectsLevel))}updateExplode(e){for(let t=this.explodeParts.length-1;t>=0;t--){let n=this.explodeParts[t];n.life-=e,n.vel.y-=18*e,n.mesh.position.addScaledVector(n.vel,e),n.mesh.rotation.x+=e*6,n.mesh.rotation.z+=e*4;let r=n.mesh.material;r.opacity=Math.max(0,n.life*1.6),n.life<=0&&(this.scene.remove(n.mesh),r.dispose(),this.explodeParts.splice(t,1))}this.explodeFlashLight&&this.explodeFlashLight.intensity>0&&(this.explodeFlashLight.intensity=Math.max(0,this.explodeFlashLight.intensity-e*10))}clearExplodeParticles(){for(let e of this.explodeParts)this.scene.remove(e.mesh),e.mesh.material.dispose();this.explodeParts.length=0,this.explodeFlashLight&&(this.explodeFlashLight.intensity=0)}clearExplode(e){this.clearExplodeParticles(),this.el.explodeFlash.classList.add(`hidden`),this.exploding=!1,this.explodeRestartAt=0,e&&this.player&&(this.player.mesh.visible=!0)}launchPower(){if(this.raceStart<=0)return Hd;let e=(this.raceNow()-this.raceStart)/1e3;return Math.min(1,Hd+(1-Hd)*(e/Ud))}toggleGodMode(){this.godMode=!this.godMode;let e=document.getElementById(`dev-god-btn`);e&&(e.textContent=`GOD MODE: ${this.godMode?`ON`:`OFF`}`,e.classList.toggle(`is-active`,this.godMode)),this.showToast(this.godMode?this.trackId===Gd?`GOD MODE — city speed + rivals`:`GOD MODE — rivals unchained`:`GOD MODE OFF`)}vehicleRadius(e){return e.mesh.userData.kind===`bike`?1.1:1.7}resolveCollisions(){let e=this.fillPack();for(let t=0;t<e.length;t++)for(let n=t+1;n<e.length;n++)this.bumpVehicles(e[t],e[n])}resolveRemoteCollisions(){for(let e of this.remotes.values()){if(this.track.heightAt&&Math.abs((this.player.state.position.y||0)-(e.mesh.position.y||0))>1.25)continue;let t=e.mesh.position.x-this.player.state.position.x,n=e.mesh.position.z-this.player.state.position.z,r=Math.hypot(t,n),i=(e.kind===`bike`?1.1:1.7)+this.vehicleRadius(this.player);if(r>=i||r<.001)continue;let a=t/r,o=n/r,s=Math.min(i-r,.5);this.player.state.position.x-=a*s,this.player.state.position.z-=o*s;let c=this.player.state,l=Math.sin(c.heading)*a+Math.cos(c.heading)*o;c.speed*l>0&&(c.speed*=1-l*l),this.player.syncCollision()}}bumpVehicles(e,t){if(this.track.heightAt&&Math.abs((e.state.position.y||0)-(t.state.position.y||0))>1.25)return;let n=t.state.position.x-e.state.position.x,r=t.state.position.z-e.state.position.z,i=Math.hypot(n,r),a=this.vehicleRadius(e)+this.vehicleRadius(t);if(i>=a||i<.001)return;let o=n/i,s=r/i,c=Math.min(a-i,.5)*.5;e.state.position.x-=o*c,e.state.position.z-=s*c,t.state.position.x+=o*c,t.state.position.z+=s*c;let l=e.state.speed,u=t.state.speed,d=Math.sin(e.state.heading)*o+Math.cos(e.state.heading)*s,f=Math.sin(t.state.heading)*o+Math.cos(t.state.heading)*s,p=l*d,m=-u*f,h=p+m;if(h>0){let n=Math.max(0,p)+Math.max(0,m);if(n>1e-4){let r=h*Math.max(0,p)/n,i=h*Math.max(0,m)/n;e.state.speed-=r*d,t.state.speed+=i*f}}e.syncCollision(),t.syncCollision()}raceProgress(e){return this.projectSticky(e,e.state.position).t}trackAlign(e,t){return Math.sin(e)*t.x+Math.cos(e)*t.z}updateWrongWay(e,t){if(this.player?.mesh.userData.kind===`bird`){this.el.wrongWay.classList.add(`hidden`);return}let n=Math.abs(t)>4&&e<-.25;this.el.wrongWay.classList.toggle(`hidden`,!n)}clampBirdToWorld(){let e=this.track.worldBounds;if(!e||!this.player)return;let t=this.player.state.position,n=e.minX+2,r=e.maxX-2,i=e.minZ+2,a=e.maxZ-2,o=!1;t.x<n?(t.x=n,o=!0):t.x>r&&(t.x=r,o=!0),t.z<i?(t.z=i,o=!0):t.z>a&&(t.z=a,o=!0),o&&(this.player.state.speed=0,this.player.syncCollision())}updateLaps(){let e=this.stickyT.get(this.player)??this.projectSticky(this.player,this.player.state.position).t,t=this.track.path.getTangentAt(e,this._lapTangent).normalize(),n=this.player.state.speed,r=this.trackAlign(this.player.state.heading,t),i=n>=0?r:-r;this.updateWrongWay(i,n),this.gates.update(this.lastT,e);let a=this.lastT>.78&&e<.22&&i>.2,o=this.lastT<.22&&e>.78&&i<-.15;if(!a&&!o&&i>.2&&this.lapStart>0&&this.sectorIdx<Bd.length&&this.lastT<Bd[this.sectorIdx]&&e>=Bd[this.sectorIdx]&&this.closeSector(this.raceNow()),a&&!o&&this.gates.readyForFinish){let e=this.raceNow(),t=e-this.lapStart;this.crossedOnce&&t>8e3?(this.lapStart>0&&this.closeSector(e),this.sectorIdx=0,t<this.bestLap&&(this.bestLap=t,this.el.best.textContent=Od(this.bestLap)),this.lapStart=e,this.lap+=1,this.gates.reset(),this.practice?this.el.lap.textContent=String(this.lap):this.lap>jd?this.finishRace():(this.el.lap.innerHTML=`${this.lap}<span>/${jd}</span>`,this.lap===jd&&this.showFinalLapFlash())):this.crossedOnce||(this.crossedOnce=!0,this.lapStart=e,this.gates.reset())}this.lastT=e}finalLapFlashUntil=0;showFinalLapFlash(){let e=document.getElementById(`final-lap-flash`);e&&(e.classList.remove(`hidden`),e.style.animation=`none`,e.offsetWidth,e.style.animation=``,this.finalLapFlashUntil=performance.now()+2200)}updateFinalLapFlash(){this.finalLapFlashUntil>0&&performance.now()>=this.finalLapFlashUntil&&(this.finalLapFlashUntil=0,document.getElementById(`final-lap-flash`)?.classList.add(`hidden`))}formatDelta(e){return`${e<=0?`-`:`+`}${Math.abs(e/1e3).toFixed(1)}`}updateDelta(e){let t=this.el.delta;if(!this.running||this.finished||this.gridHeld||this.lapStart===0||!this.sectorRef||this.sectorIdx===0){t.textContent!==``&&(t.textContent=``);return}let n=0;for(let e=0;e<this.sectorIdx;e++){let r=this.sectorRef[e]??1/0;if(!Number.isFinite(r)){t.textContent!==``&&(t.textContent=``);return}n+=r}let r=this.raceNow()-this.lapStart-n;t.textContent=this.formatDelta(r),t.classList.toggle(`gain`,r<=0),t.classList.toggle(`loss`,r>0)}sectorStorageKey(){let e=this.player?.mesh.userData.kind??`car`;return`${Vd}${this.trackId}.${e}`}loadSectorRef(){try{let e=localStorage.getItem(this.sectorStorageKey());if(!e)return null;let t=JSON.parse(e);if(Array.isArray(t)&&t.length===Bd.length+1&&t.every(e=>typeof e==`number`&&e>0))return t}catch{}return null}saveSectorRef(e){try{localStorage.setItem(this.sectorStorageKey(),JSON.stringify(e))}catch{}}closeSector(e){let t=!1;if(this.sectorRef??=Array(Bd.length+1).fill(1/0),this.sectorStartMs>0){let n=this.sectorIdx,r=e-this.sectorStartMs;r>1e3&&r<9e5&&r<this.sectorRef[n]&&(this.sectorRef[n]=r,t=!0)}t&&this.saveSectorRef(this.sectorRef),this.sectorIdx+=1,this.sectorStartMs=e}resetMapVote(){this.mapVoteTimer&&window.clearInterval(this.mapVoteTimer),this.mapVoteOptions=[],this.mapVoteTrackId=``,this.mapVoteEndsAt=0,this.mapVoteReceived=0,this.mapVoteTotal=0,this.mapVoteTimer=0,this.el.mpMapVote.classList.add(`hidden`),this.el.mpMapVoteGrid.replaceChildren(),this.el.restartBtn.classList.remove(`hidden`)}showMapVote(e,t){if(this.mapVoteOptions=e.filter((e,t)=>t<6&&ya.some(t=>t.id===e)),this.mapVoteTrackId=``,this.mapVoteEndsAt=t,this.mapVoteReceived=0,this.mapVoteTotal=this.remotes.size+1,!this.online||this.mapVoteOptions.length===0){this.resetMapVote();return}this.el.restartBtn.classList.add(`hidden`),this.el.mpMapVote.classList.remove(`hidden`),this.el.mpMapVoteGrid.replaceChildren(),this.mapVoteOptions.forEach((e,t)=>{let n=Oa(e),r=document.createElement(`button`);r.type=`button`,r.className=`map-thumb mp-vote-option`,r.dataset.trackId=e,r.setAttribute(`role`,`option`),r.setAttribute(`aria-label`,`${t+1}: ${n.name}`),r.setAttribute(`aria-selected`,`false`);let i=document.createElement(`canvas`),a=document.createElement(`span`),o=document.createElement(`span`);a.className=`mp-vote-key`,a.textContent=String(t+1),o.className=`mp-vote-count`,o.textContent=`0`,r.append(i,a,o),r.onclick=()=>this.castMapVote(e),this.el.mpMapVoteGrid.appendChild(r),requestAnimationFrame(()=>ms(i,e))}),this.renderMapVoteStatus(),this.mapVoteTimer=window.setInterval(()=>this.renderMapVoteStatus(),250)}castMapVote(e){if(!(this.mapVoteTrackId||!this.mapVoteOptions.includes(e))){this.mapVoteTrackId=e,this.net.voteForTrack(e);for(let t of this.el.mpMapVoteGrid.querySelectorAll(`.mp-vote-option`)){let n=t.dataset.trackId===e;t.disabled=!0,t.classList.toggle(`selected`,n),t.setAttribute(`aria-selected`,n?`true`:`false`)}this.renderMapVoteStatus()}}updateMapVote(e,t,n){this.mapVoteReceived=t,this.mapVoteTotal=n;for(let t of this.el.mpMapVoteGrid.querySelectorAll(`.mp-vote-option`)){let n=t.dataset.trackId||``,r=t.querySelector(`.mp-vote-count`);r&&(r.textContent=String(e[n]??0))}this.renderMapVoteStatus()}renderMapVoteStatus(){let e=Math.max(0,Math.ceil((this.mapVoteEndsAt-Date.now())/1e3)),t=`${this.mapVoteReceived}/${this.mapVoteTotal} voted`;this.el.mpMapVoteStatus.textContent=this.mapVoteTrackId?`${e}s · ${t} · Vote locked: ${Oa(this.mapVoteTrackId).name}`:`${e}s · ${t} · Press 1–6`}showMapVoteResult(e){this.mapVoteTimer&&window.clearInterval(this.mapVoteTimer),this.mapVoteTimer=0;let t=Oa(e);for(let t of this.el.mpMapVoteGrid.querySelectorAll(`.mp-vote-option`)){let n=t.dataset.trackId===e;t.disabled=!0,t.classList.toggle(`selected`,n),t.setAttribute(`aria-selected`,n?`true`:`false`)}this.el.mpMapVoteStatus.textContent=`${t.name} wins · next race starting…`}applyOnlineResult(e,t){let n=this.remotes.size+1,r=e===this.net.id,i=r?1:Math.max(2,this.playerFinishPlace());this.el.finalPlace.textContent=`${Math.min(i,n)}/${n}`,r?(this.el.finishEyebrow.textContent=`RACE WINNER`,this.el.finishTitle.textContent=`YOU WIN`):(this.el.finishEyebrow.textContent=`${t} WINS`,this.el.finishTitle.textContent=`YOU LOST`)}applyEventResult(e){let t=this.net.event;if(!this.online||!t)return;let n=t.mode===`battle`,r=this.net.id,i=Math.max(0,Math.round(t.battleClaimable?.[r]??t.battleEarnings?.[r]??0)),a=!!t.battleClaimedIds?.includes(r),o=n?i>0&&!a:e===r;document.getElementById(`event-checkout`)?.classList.toggle(`hidden`,!o);let s=document.getElementById(`event-lost-note`);s&&(n?(s.textContent=i>0?a?`Share claimed`:``:`No cubes collected — uncollected sats go to the developer`,s.classList.toggle(`hidden`,o)):(s.textContent=`Winner takes the pot`,s.classList.toggle(`hidden`,o))),this.el.restartBtn.classList.add(`hidden`),o&&this.setupEventCheckout(t)}setupBattleCubes(e){this.clearBattleCubes(),this.battlePickupPending.clear(),this.battlePrevValid=!1;let t=document.getElementById(`battle-earnings-block`),n=document.getElementById(`battle-earnings`);if(!e?.length){t?.classList.add(`hidden`);return}this.battleCubes=Cc(this.scene,e),n&&(n.textContent=`0`),t?.classList.remove(`hidden`)}clearBattleCubes(){Tc(this.scene,this.battleCubes),this.battleCubes=[],this.battlePickupPending.clear(),this.battlePrevValid=!1,this.clearBattleRoulette(),document.getElementById(`battle-earnings-block`)?.classList.add(`hidden`)}onBattleCubeTaken(e){let t=this.battleCubes.find(t=>t.id===e.cubeId);t&&!t.taken&&(t.taken=!0,t.mesh.visible=!1),this.battlePickupPending.delete(e.cubeId),e.byId===this.net.id?this.startBattleRoulette(e.sats,e.earnings):this.online&&!this.finished&&this.showToast(`${e.byName} +${e.sats} sats`)}onBattleCubesDropped(e){if(!e.cubes?.length)return;let t=Cc(this.scene,e.cubes);if(this.battleCubes.push(...t),document.getElementById(`battle-earnings-block`)?.classList.remove(`hidden`),e.fromId===this.net.id){this.clearBattleRoulette();let e=document.getElementById(`battle-earnings`);e&&(e.textContent=`0`)}else this.online&&!this.finished&&this.showToast(`${e.fromName} dropped ${e.haulSats} sats`)}startBattleRoulette(e,t){let n=new Set;for(let e of this.battleCubes)e.sats>0&&n.add(e.sats);let r=[...n];r.length||r.push(e);for(let e of r)n.add(Math.max(1,Math.round(e*.5))),n.add(Math.max(1,Math.round(e*1.5))),n.add(Math.max(1,e+1));n.add(e);let i=[...n].sort((e,t)=>e-t),a=performance.now();this.battleRoulette={award:e,earningsAfter:t,options:i,startMs:a,lockAtMs:a+1100+Math.random()*350,locked:!1};let o=document.getElementById(`battle-roulette`),s=document.getElementById(`battle-roulette-value`);s&&(s.textContent=String(i[0]??e)),o?.classList.remove(`hidden`,`is-locked`),o?.classList.add(`is-spinning`),o?.setAttribute(`aria-hidden`,`false`)}clearBattleRoulette(){this.battleRoulette=null;let e=document.getElementById(`battle-roulette`);e?.classList.add(`hidden`),e?.classList.remove(`is-spinning`,`is-locked`),e?.setAttribute(`aria-hidden`,`true`);let t=document.getElementById(`battle-roulette-value`);t&&(t.textContent=`—`)}tickBattleRoulette(e){let t=this.battleRoulette;if(!t)return;let n=document.getElementById(`battle-roulette-value`),r=document.getElementById(`battle-roulette`);if(!t.locked){if(e>=t.lockAtMs){t.locked=!0,n&&(n.textContent=String(t.award)),r?.classList.remove(`is-spinning`),r?.classList.add(`is-locked`);let e=document.getElementById(`battle-earnings`);e&&(e.textContent=String(t.earningsAfter)),window.setTimeout(()=>{this.battleRoulette===t&&this.clearBattleRoulette()},900);return}let i=Math.min(1,(e-t.startMs)/Math.max(1,t.lockAtMs-t.startMs)),a=40+i*i*160,o=Math.floor(e/a)%t.options.length;n&&(n.textContent=String(t.options[o]??t.award))}}tickBattleCubes(e){if(!this.battleCubes.length||this.finished){this.tickBattleRoulette(performance.now()),this.battlePrevValid=!1;return}if(Dc(this.battleCubes,e),this.tickBattleRoulette(performance.now()),this.onlineWrecked||!this.online||!this.net.event||this.net.event.mode!==`battle`){this.battlePrevValid=!1;return}let t=this.player.state.position.x,n=this.player.state.position.z,r=6+gc,i=r*r,a=performance.now();for(let e of this.battleCubes){if(e.taken)continue;let r=(e.x-t)*(e.x-t)+(e.z-n)*(e.z-n)<=i,o=this.battlePrevValid&&wc(e.x,e.z,this.battlePrevX,this.battlePrevZ,t,n)<=i;if(!r&&!o)continue;let s=this.battlePickupPending.get(e.id);s!=null&&a-s<180||(this.battlePickupPending.set(e.id,a),this.net.pickupCube(e.id,t,n))}this.battlePrevX=t,this.battlePrevZ=n,this.battlePrevValid=!0}finishRace(e){if(this.roomSpectating){e?.winnerName&&this.showToast(`${e.winnerName} wins`);return}if(this.finished){this.online&&e&&this.presentOnlineFinish(e);return}if(this.online&&!e){this.finished=!0,this.onlineFinishPending=!0,this.paused=!1,this.clearCountdown(),this.pendingFinishMs=this.raceNow()-this.raceStart,this.commitGhostIfBest(this.pendingFinishMs),this.net.reportFinish(this.pendingFinishMs,this.bestLap),this.el.wrongWay.classList.add(`hidden`),this.el.delta.textContent=``,this.enterSpectate(),this.spectating||this.showToast(`Finished — waiting for results`);return}this.finished=!0,this.onlineFinishPending=!1,this.running=!1,this.paused=!1,this.stopSpectate(),this.clearCountdown(),this.clearExplode(!0),this.clearOnlineWreck(),this.battlePickupPending.clear(),this.battlePrevValid=!1;for(let e of this.battleCubes)e.taken=!0;this.audio.mute(),this.audio.stopRaceAudio(),this.el.wrongWay.classList.add(`hidden`),this.el.explodeFlash.classList.add(`hidden`),this.hideAnimalHit(),this.el.pause.classList.add(`hidden`),this.el.pauseBtn.classList.add(`hidden`),this.el.minimap.classList.add(`hidden`),this.syncTouchControls(),this.syncMuteBtn(),this.pendingFinishMs<=0&&(this.pendingFinishMs=this.raceNow()-this.raceStart),this.commitGhostIfBest(this.pendingFinishMs),this.showFinishOverlay(e)}presentOnlineFinish(e){let t=this.onlineFinishPending||this.el.finish.classList.contains(`hidden`);this.onlineFinishPending=!1,this.stopSpectate(),this.running=!1,this.paused=!1,this.clearCountdown(),this.clearExplode(!0),this.clearOnlineWreck(),this.battlePickupPending.clear(),this.battlePrevValid=!1;for(let e of this.battleCubes)e.taken=!0;this.audio.mute(),this.audio.stopRaceAudio(),this.el.wrongWay.classList.add(`hidden`),this.el.explodeFlash.classList.add(`hidden`),this.hideAnimalHit(),this.el.pause.classList.add(`hidden`),this.el.pauseBtn.classList.add(`hidden`),this.el.minimap.classList.add(`hidden`),this.syncTouchControls(),this.syncMuteBtn(),this.pendingFinishMs<=0&&(this.pendingFinishMs=e.winnerId===this.net.id?e.officialTimeMs:this.raceNow()-this.raceStart),t?this.showFinishOverlay(e):(this.applyOnlineResult(e.winnerId,e.winnerName),this.showMapVote(e.trackOptions,e.voteEndsAt),this.applyEventResult(e.winnerId))}showFinishOverlay(e){this.el.finalTime.textContent=Od(this.pendingFinishMs),this.el.finalBest.textContent=Od(this.bestLap),this.el.nameEntry.classList.add(`hidden`),this.el.driverName.value=``;let t=this.playerFinishPlace(),n=this.online?this.remotes.size+1:this.solo?1:this.rivals.length+1;this.el.finalPlace.textContent=`${t}/${n}`,this.online&&e?(this.applyOnlineResult(e.winnerId,e.winnerName),this.showMapVote(e.trackOptions,e.voteEndsAt)):t===1?(this.el.finishEyebrow.textContent=`RACE WINNER`,this.el.finishTitle.textContent=`YOU WIN`):(this.el.finishEyebrow.textContent=`RACE COMPLETE`,this.el.finishTitle.textContent=`P${t}`);let r=document.getElementById(`finish-callouts`);if(r){let e=t<=3;r.innerHTML=e?`<span class="finish-callout is-podium">PODIUM FINISH</span>`:``,r.classList.toggle(`hidden`,!e)}this.online&&this.net.event?e?this.applyEventResult(e.winnerId):this.el.restartBtn.classList.add(`hidden`):(document.getElementById(`event-checkout`)?.classList.add(`hidden`),document.getElementById(`event-lost-note`)?.classList.add(`hidden`)),this.el.finish.classList.remove(`hidden`),(!this.online||!e||e.winnerId===this.net.id)&&this.checkLeaderboardQualify()}playerFinishPlace(){if(this.online){let e=this.lap-1+this.raceProgress(this.player),t=1;for(let n of this.remotes.values()){if(n.wrecked||this.wreckedIds.has(n.id))continue;let r=this.projectSticky(n,n.mesh.position).t;(n.lap??1)-1+r>e+.002&&(t+=1)}return t}return this.solo?1:1+this.rivals.filter(e=>e.raceDone).length}async checkLeaderboardQualify(){await bl(this.pendingFinishMs,this.trackId)&&(this.el.nameEntry.classList.remove(`hidden`),this.renderNameEntryState())}renderNameEntryState(){let e=_(),t=document.getElementById(`name-entry-label`),n=document.getElementById(`submit-score-btn`),r=document.getElementById(`nostr-save-login-btn`);if(this.el.driverName.classList.toggle(`hidden`,!e),n?.classList.toggle(`hidden`,!e),r?.classList.toggle(`hidden`,!!e),t&&(t.textContent=e?`Top 10 time — saved with your Nostr signature`:`Top 10 time — sign in with Nostr to save it verified`),e){if(!this.el.driverName.value.trim()){let e=this.nostrDisplayName()??Tl()??``;this.el.driverName.value=e,this.nostrDisplayNameAsync().then(t=>{t&&this.el.driverName.value===e&&(this.el.driverName.value=t)})}this.el.driverName.focus()}}updateHud(){let e=performance.now();if(e-this.lastHudAt<50)return;this.lastHudAt=e,this.el.speed.textContent=String(Math.round(this.player.kmh)),this.el.gear.textContent=this.player.gearLabel,this.updateTachometer();let t=this.gridHeld||this.raceStart===0?0:this.practice?this.raceNow()-this.lapStart:this.raceNow()-this.raceStart;if(this.el.time.textContent=Od(t),this.updateFinalLapFlash(),this.updateDelta(t),this.updateAnimalHit(),this.perfThrottle||this.updateMinimap(),this.el.position)if(this.solo)this.el.position.textContent=`1/1`;else{let e=this.stickyT.get(this.player)??this.raceProgress(this.player),t=this.lap-1+e,n=1;if(this.online){let e=1;for(let r of this.remotes.values()){if(r.wrecked||this.wreckedIds.has(r.id))continue;e+=1;let i=this.projectSticky(r,r.mesh.position).t;(r.lap??1)-1+i>t+.002&&(n+=1)}this.el.position.textContent=`${n}/${e}`}else{let e=1;for(let r of this.rivals)e+=1,(r.raceDone?3.001:r.progress)>t+.002&&(n+=1);this.el.position.textContent=`${n}/${e}`}}}updateTachometer(){let e=this.el.speedDial;if(!e||!this.player)return;let t=this.player.mesh.userData.kind!==`bird`;e.classList.toggle(`is-no-gears`,!t);let n=this.player.state.gear,r=n===5,i=this.player.rpmNorm;r?i=Math.min(.92,i*.88):n===4&&(i=Math.min(1.05,i*1.04));let a=this.el.tachFill;if(a){let e=t?Math.max(0,Math.min(100,i*100)):0;a.setAttribute(`stroke-dasharray`,`${e} 100`)}let o=this.el.tachNeedle;if(o){let e=-90+(t?Math.max(0,Math.min(1,i)):0)*180;o.setAttribute(`transform`,`rotate(${e} 100 102)`)}let s=t&&typeof n==`number`&&n>=1&&n<5;e.classList.toggle(`is-top-gear`,r||!s),e.classList.toggle(`is-hot`,s&&i>=.68&&i<.8),e.classList.toggle(`is-redline`,s&&i>=.8)}ensureMinimapTrack(){let e=this.track.path;if(this.minimapPath===e&&this.minimapPts.length>0)return;this.minimapPath=e;let t=[],n=1/0,r=-1/0,i=1/0,a=-1/0,o=this._pathScratch;for(let s=0;s<180;s++)e.getPointAt(s/180,o),t.push({x:o.x,z:o.z}),o.x<n&&(n=o.x),o.x>r&&(r=o.x),o.z<i&&(i=o.z),o.z>a&&(a=o.z);let s=t[0];t.push({x:s.x,z:s.z}),this.minimapPts=t,this.minimapBounds={cx:(n+r)*.5,cz:(i+a)*.5,span:Math.max(r-n,a-i,1)+16}}worldToMinimap(e,t,n,r){let{cx:i,cz:a,span:o}=this.minimapBounds,s=(Math.min(n,r)-20)/o;return[n*.5+(e-i)*s,r*.5+(t-a)*s]}updateMinimap(){let e=this.el.minimap;if(!e)return;if(!this.running||this.finished&&!this.onlineFinishPending&&!this.spectating){e.classList.add(`hidden`);return}e.classList.remove(`hidden`),this.ensureMinimapTrack();let t=Math.min(devicePixelRatio,2),n=e.clientWidth||190,r=e.clientHeight||190,i=Math.round(n*t),a=Math.round(r*t);(e.width!==i||e.height!==a)&&(e.width=i,e.height=a),this.minimapCtx||=e.getContext(`2d`);let o=this.minimapCtx;if(!o)return;this.ensureMinimapTrackBitmap(i,a,t),this.minimapTrackCanvas?o.drawImage(this.minimapTrackCanvas,0,0):(o.clearRect(0,0,i,a),o.fillStyle=`rgba(8, 12, 20, 0.55)`,o.fillRect(0,0,i,a));let s=(e,n,r,s)=>{let[c,l]=this.worldToMinimap(e,n,i,a);o.beginPath(),o.arc(c,l,s*t,0,Math.PI*2),o.fillStyle=r,o.fill()};if(this.online)for(let e of this.remotes.values())s(e.mesh.position.x,e.mesh.position.z,`#7ec8ff`,3.2);else if(!this.solo)for(let e=0;e<this.rivals.length;e++){let t=this.rivals[e];if(t.disabledUntil>0)continue;let n=t.vehicle.state.position;s(n.x,n.z,this._rivalCss[e]??`#e23b2e`,3.2)}let c=this.player.state.position;s(c.x,c.z,`#ffffff`,4.2),s(c.x,c.z,`#ff3b2e`,2.6)}ensureMinimapTrackBitmap(e,t,n){let r=`${e}x${t}@${n}:${this.minimapPts.length}`;if(this.minimapTrackCanvas&&this.minimapTrackKey===r)return;this.minimapTrackKey=r,this.minimapTrackCanvas||=document.createElement(`canvas`);let i=this.minimapTrackCanvas;i.width=e,i.height=t;let a=i.getContext(`2d`);if(a){a.clearRect(0,0,e,t),a.fillStyle=`rgba(8, 12, 20, 0.55)`,a.fillRect(0,0,e,t),a.beginPath();for(let n=0;n<this.minimapPts.length;n++){let r=this.minimapPts[n],[i,o]=this.worldToMinimap(r.x,r.z,e,t);n===0?a.moveTo(i,o):a.lineTo(i,o)}a.strokeStyle=`rgba(242, 245, 250, 0.55)`,a.lineWidth=2*n,a.lineJoin=`round`,a.stroke()}}snapCamera(){let e=this.player.state,t=e.position.y;this.camPos.set(e.position.x-Math.sin(e.heading)*12,4.5+t,e.position.z-Math.cos(e.heading)*12),this.camLook.set(e.position.x+Math.sin(e.heading)*8,1.2+t,e.position.z+Math.cos(e.heading)*8),this.camera.position.copy(this.camPos),this.camera.lookAt(this.camLook)}spectateCandidates(){let e=[];for(let t of this.remotes.values())!this.roomSpectating&&(t.wrecked||this.wreckedIds.has(t.id))||e.push(t);return e}enterSpectate(){if(!this.online||(this.practice||this.solo)&&!this.roomSpectating)return;let e=this.spectateCandidates();if(e.length===0){this.stopSpectate();return}this.spectating=!0,this.spectateJumpHeld=!1;let t=this.preferredSpectateTargetId;t&&e.some(e=>e.id===t)?this.spectateTargetId=t:e.some(e=>e.id===this.spectateTargetId)||(this.spectateTargetId=e[0].id),this.refreshSpectateHud(),this.el.spectateHud.classList.remove(`hidden`),this.snapSpectateCamera()}exitSpectate(){if(this.spectating){if(this.roomSpectating){this.goHome();return}this.spectating=!1,this.spectateTargetId=null,this.spectateJumpHeld=!1,this.el.spectateHud.classList.add(`hidden`),this.snapCamera()}}stopSpectate(){this.spectating=!1,this.spectateTargetId=null,this.spectateJumpHeld=!1,this.el.spectateHud.classList.add(`hidden`)}refreshSpectateHud(){let e=(this.spectateTargetId?this.remotes.get(this.spectateTargetId):void 0)?.name??`—`;this.el.spectateTitle.textContent=this.roomSpectating?`LIVE · ${e}`:`SPECTATING · ${e}`;let t=this.spectateCandidates().length;this.el.spectateHint.textContent=this.roomSpectating?t>1?`Space / Next · Esc back to DEV`:`Esc back to DEV`:t>1?`Space / Next · Esc exit`:`Esc exit`,this.el.spectateNextBtn.classList.toggle(`hidden`,t<=1)}cycleSpectateTarget(e){let t=this.spectateCandidates();if(t.length===0)return this.exitSpectate(),!1;let n=t.findIndex(e=>e.id===this.spectateTargetId);return n=n<0?0:(n+e+t.length)%t.length,this.spectateTargetId=t[n].id,this.refreshSpectateHud(),this.snapSpectateCamera(),!0}snapSpectateCamera(){let e=this.spectateTargetId?this.remotes.get(this.spectateTargetId):void 0;if(!e)return;let t=e.mesh.position.x,n=e.mesh.position.y,r=e.mesh.position.z,i=e.mesh.rotation.y;this.camPos.set(t-Math.sin(i)*12,4.5+n,r-Math.cos(i)*12),this.camLook.set(t+Math.sin(i)*8,1.2+n,r+Math.cos(i)*8),this.camera.position.copy(this.camPos),this.camera.lookAt(this.camLook)}birdLookDown=!1;updateCamera(e){if(this.spectating){let t=this.spectateTargetId?this.remotes.get(this.spectateTargetId):void 0;if(!t||!this.roomSpectating&&(t.wrecked||this.wreckedIds.has(t.id))){this.cycleSpectateTarget(1)||this.updateCameraOnPlayer(e);return}let n=t.mesh.position.x,r=t.mesh.position.y,i=t.mesh.position.z,a=t.mesh.rotation.y,o=5+r;this._camIdeal.set(n-Math.sin(a)*14,o,i-Math.cos(a)*14);let s=e<=0?1:1-Math.exp(-6*e);this.camPos.lerp(this._camIdeal,s),this.camera.position.copy(this.camPos),this._camLookTarget.set(n+Math.sin(a)*10,1.4+r,i+Math.cos(a)*10),this.camLook.lerp(this._camLookTarget,e<=0?1:1-Math.exp(-8*e)),this.camera.lookAt(this.camLook);return}this.updateCameraOnPlayer(e)}updateCameraOnPlayer(e){let t=this.player.state,n=t.position.y,r=this.player.mesh.userData.kind===`bird`;if(r&&this.birdLookDown){let r=42+n;this._camIdeal.set(t.position.x,r,t.position.z);let i=e<=0?1:1-Math.exp(-8*e);this.camPos.lerp(this._camIdeal,i),this.camera.position.copy(this.camPos),this._camLookTarget.set(t.position.x,n,t.position.z),this.camLook.lerp(this._camLookTarget,e<=0?1:1-Math.exp(-10*e)),this.camera.lookAt(this.camLook);return}let i=r?16:12+Math.min(Math.abs(t.speed)*.07,6),a=r?6.5+n:4.4+Math.min(Math.abs(t.speed)*.028,1.8)+n;this._camIdeal.set(t.position.x-Math.sin(t.heading)*i,a,t.position.z-Math.cos(t.heading)*i);let o=e<=0?1:1-Math.exp(-6*e);this.camPos.lerp(this._camIdeal,o),this.camera.position.copy(this.camPos),this._camLookTarget.set(t.position.x+Math.sin(t.heading)*(r?14:10),(r?.4:1.4)+n,t.position.z+Math.cos(t.heading)*(r?14:10)),this.camLook.lerp(this._camLookTarget,e<=0?1:1-Math.exp(-8*e)),this.camera.lookAt(this.camLook)}};function rf(e){return e.replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`)}export{nf as Game};