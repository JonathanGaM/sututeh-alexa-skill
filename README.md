Sututeh - Skill de Alexa
Una skill de Alexa desarrollada con APL (Alexa Presentation Language) para proporcionar una experiencia interactiva y visual.
Descripción
Sututeh es una skill de Alexa que incluye:

Interfaz visual con APL
Documentos interactivos para diferentes pantallas
Soporte para múltiples opciones de navegación
Experiencia de usuario personalizada

Características

Pantalla de bienvenida: Documento APL de bienvenida al usuario
Dashboard interactivo: Panel principal con opciones de navegación
Autenticación visual: Pantalla de autenticación con APL
Múltiples opciones: Documentos APL para diferentes funcionalidades
Soporte para español mexicano (es-MX)

Estructura del Proyecto
sututeh/
├── assets/
│   └── images/          # Iconos de la skill
├── interactionModels/
│   └── custom/
│       └── es-MX.json   # Modelo de interacción en español
├── lambda/
│   ├── index.js         # Función principal de Lambda
│   ├── package.json     # Dependencias del proyecto
│   └── util.js          # Utilidades auxiliares
├── response/
│   └── display/         # Documentos APL
│       ├── authenticationDocument/
│       ├── dashboardDocument/
│       ├── option1Document/
│       ├── option2Document/
│       └── welcomeDocument/
└── skill.json          # Configuración de la skill
Tecnologías Utilizadas

AWS Lambda: Backend de la skill
APL (Alexa Presentation Language): Interfaz visual
Node.js: Runtime de JavaScript
Alexa Skills Kit: Framework de desarrollo

