# Andes · Radar laboral Ecuador

Aplicación estática para explorar oportunidades públicas de trabajo en Ecuador y cotejarlas con un curriculum. El análisis del CV ocurre en el navegador: el archivo no se sube ni se guarda.

## Ejecutar localmente

```bash
python3 -m http.server 8788
```

Visita `http://localhost:8788`.

## Desplegar en Cloudflare Pages

1. Sube este repositorio a GitHub.
2. En Cloudflare: **Workers & Pages > Create application > Pages > Connect to Git**.
3. Configura preset `None`, comando de build vacío y directorio de salida `/` o `.`.

Con Wrangler:

```bash
npx wrangler pages deploy . --project-name andes-radar
```

## Fuentes y alcance

El catálogo inicial está normalizado para el prototipo y enlaza a páginas públicas de Socio Empleo, Multitrabajos y LinkedIn Jobs. Para producción, un Worker de Cloudflare debe consultar fuentes que autoricen automatización, respetar límites, CAPTCHAs, robots.txt y autenticación. No se deben saltar esas protecciones.
