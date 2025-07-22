const Alexa = require("ask-sdk-core");
const https = require('https');
const axios = require('axios');

// 👉 URLs de APIs - AUTENTICACIÓN, EMPRESA Y CONTENIDO
const API_AUTH_FECHA_URL = 'https://sututeh-server.onrender.com/api/verificar-usuario/verificar-fecha-nacimiento';
const API_AUTH_COMPLETO_URL = 'https://sututeh-server.onrender.com/api/verificar-usuario/verificar-usuario-completo';
const API_NOTICIAS_SEMANA_URL = 'https://sututeh-server.onrender.com/api/verificar-usuario/noticias-semana-actual';
const API_REUNIONES_FUTURAS_URL = 'https://sututeh-server.onrender.com/api/verificar-usuario/reuniones-futuras-mes';

// 👉 Función para consultar datos de la empresa
const consultarDatosEmpresa = async () => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'sututeh-server.onrender.com',
      path: '/api/datos-empresa',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const empresas = JSON.parse(data);
          const empresa = empresas[0] || {};
          
          console.log('✅ Datos de empresa recibidos:', empresa);
          
          resolve({
            logoUrl: empresa.avatar_url || "https://res.cloudinary.com/dat3wjeko/image/upload/v1750010102/datos_empresa/flkjybpapetomcgv7exo.png",
            tituloEmpresa: empresa.titulo_empresa || "SUTUTEH",
            nombreEmpresa: empresa.nombre_empresa || "Sistema del Sindicato",
            coverUrl: empresa.cover_url || "https://d2o906d8ln7ui1.cloudfront.net/images/templates_v3/headline/HeadlineBackground_Dark.png"
          });
        } catch (error) {
          console.error('❌ Error parsing JSON:', error);
          resolve({
            logoUrl: "https://res.cloudinary.com/dat3wjeko/image/upload/v1750010102/datos_empresa/flkjybpapetomcgv7exo.png",
            tituloEmpresa: "SUTUTEH",
            nombreEmpresa: "Sistema del Sindicato",
            coverUrl: "https://d2o906d8ln7ui1.cloudfront.net/images/templates_v3/headline/HeadlineBackground_Dark.png"
          });
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Error en request HTTPS:', error);
      resolve({
        logoUrl: "https://res.cloudinary.com/dat3wjeko/image/upload/v1750010102/datos_empresa/flkjybpapetomcgv7exo.png",
        tituloEmpresa: "SUTUTEH",
        nombreEmpresa: "Sistema del Sindicato",
        coverUrl: "https://d2o906d8ln7ui1.cloudfront.net/images/templates_v3/headline/HeadlineBackground_Dark.png"
      });
    });

    req.setTimeout(5000, () => {
      console.error('❌ Timeout en request');
      req.destroy();
      resolve({
        logoUrl: "https://res.cloudinary.com/dat3wjeko/image/upload/v1750010102/datos_empresa/flkjybpapetomcgv7exo.png",
        tituloEmpresa: "SUTUTEH",
        nombreEmpresa: "Sistema del Sindicato",
        coverUrl: "https://d2o906d8ln7ui1.cloudfront.net/images/templates_v3/headline/HeadlineBackground_Dark.png"
      });
    });

    req.end();
  });
};

// 👉 Función para crear directiva APL con datos dinámicos
const createDirectivePayloadWithAPI = async (aplDocumentId, extraData = {}, tokenId = "documentToken") => {
  const datosEmpresa = await consultarDatosEmpresa();
  
  console.log('🔧 Datos empresa para APL:', datosEmpresa);
  
  const dataSources = {
    sututehStrings: {
      headerTitle: datosEmpresa.tituloEmpresa,
      logoUrl: datosEmpresa.logoUrl,
      nombreEmpresa: datosEmpresa.nombreEmpresa,
      coverUrl: datosEmpresa.coverUrl,
      ...extraData
    }
  };

  console.log('📝 DataSources enviados a APL:', dataSources);

  return {
    type: "Alexa.Presentation.APL.RenderDocument",
    token: tokenId,
    document: {
      type: "Link",
      src: "doc://alexa/apl/documents/" + aplDocumentId
    },
    datasources: dataSources
  };
};

// ===== FUNCIONES AUXILIARES =====

function isUserAuthenticated(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    return sessionAttributes.userAuthenticated === true;
}

function requestAuthentication(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    
    if (!sessionAttributes.fechaNacimientoVerificada) {
        const speakOutput = 'Para acceder a este servicio, necesito verificar tu identidad. ' +
            'Primero, dime tu fecha de nacimiento. Por ejemplo: ' +
            '"mi fecha de nacimiento es veintitrés de agosto de dos mil cuatro".';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt('Dime tu fecha de nacimiento.')
            .getResponse();
    } else {
        const speakOutput = 'Ahora necesito tu número de sindicalizado. Por ejemplo: ' +
            '"mi número es mil quince" o "mi número sindicalizado es uno cero uno cinco".';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt('Dime tu número de sindicalizado.')
            .getResponse();
    }
}

function formatearFecha(fecha) {
    const opciones = { 
        day: 'numeric', 
        month: 'long',
        year: 'numeric',
        timeZone: 'America/Mexico_City'
    };
    
    return fecha.toLocaleDateString('es-MX', opciones);
}

function formatearFechaReunion(fecha) {
    const opciones = { 
        weekday: 'long',
        day: 'numeric', 
        month: 'long',
        timeZone: 'America/Mexico_City'
    };
    
    return fecha.toLocaleDateString('es-MX', opciones);
}

function formatearHora(timeString) {
    const [horas, minutos] = timeString.split(':');
    const hora24 = parseInt(horas);
    const min = parseInt(minutos);
    
    let hora12 = hora24;
    let periodo = 'de la mañana';
    
    if (hora24 === 0) {
        hora12 = 12;
        periodo = 'de la medianoche';
    } else if (hora24 === 12) {
        periodo = 'del mediodía';
    } else if (hora24 > 12) {
        hora12 = hora24 - 12;
        periodo = 'de la tarde';
    }
    
    if (min === 0) {
        return `${hora12} ${periodo}`;
    } else {
        return `${hora12} y ${min} minutos ${periodo}`;
    }
}


// ===== HANDLERS OPTIMIZADOS CON RESPUESTAS MÁS CORTAS =====

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === "LaunchRequest";
  },
  async handle(handlerInput) {
    const speakOutput = "¡Bienvenido a SUTUTEH! Presiona continuar para acceder.";
    
    const extraData = {
      primaryText: "¡Bienvenido!",
      hintText: "Presiona 'Continuar' para acceder al sistema"
    };

    const directive = await createDirectivePayloadWithAPI("welcomeDocument", extraData);

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt("Presiona continuar.")
      .addDirective(directive)
      .getResponse();
  }
};






const AuthenticationHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "AuthenticationIntent";
  },
  async handle(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    
    if (sessionAttributes.userAuthenticated) {
      return await DashboardHandler.handle(handlerInput);
    }
    
    const speakOutput = 'Necesito verificar tu identidad. Dime tu fecha de nacimiento. ' +
        'Por ejemplo: "mi fecha de nacimiento es veintitrés de agosto de dos mil cuatro".';
    
    const extraData = {
      primaryText: "Autenticación",
      secondaryText: "Verifica tu identidad para continuar",
      hintText: "Di tu fecha de nacimiento para continuar"
    };

    const directive = await createDirectivePayloadWithAPI("authenticationDocument", extraData);

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt('Dime tu fecha de nacimiento.')
      .addDirective(directive)
      .getResponse();
  }
};

const CapturarFechaNacimientoHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'CapturarFechaNacimientoIntent';
    },
    async handle(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        
        if (sessionAttributes.userAuthenticated) {
            return await DashboardHandler.handle(handlerInput);
        }
        
        try {
            const fechaNacimiento = Alexa.getSlotValue(handlerInput.requestEnvelope, 'fechaNacimiento');
            
            if (!fechaNacimiento) {
                const speakOutput = 'No entendí tu fecha. Repite tu fecha de nacimiento claramente.';
                
                const extraData = {
                    primaryText: "Autenticación",
                    secondaryText: "Fecha no reconocida, intenta de nuevo",
                    hintText: "Di tu fecha de nacimiento claramente"
                };

                const directive = await createDirectivePayloadWithAPI("authenticationDocument", extraData);

                return handlerInput.responseBuilder
                    .speak(speakOutput)
                    .reprompt('Dime tu fecha de nacimiento.')
                    .addDirective(directive)
                    .getResponse();
            }
            
            console.log(`🔍 Verificando fecha de nacimiento: ${fechaNacimiento}`);
            
            const response = await axios.post(API_AUTH_FECHA_URL, {
                fechaNacimiento: fechaNacimiento
            }, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Alexa-Skill-SUTUTEH/1.0',
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.data.autorizado) {
                sessionAttributes.fechaNacimientoVerificada = fechaNacimiento;
                handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
                
                console.log(`✅ Fecha de nacimiento válida: ${fechaNacimiento}`);
                
                const speakOutput = 'Fecha verificada. Ahora dime tu número sindicalizado. ' +
                    'Por ejemplo: "mi número es mil quince".';

                const extraData = {
                    primaryText: "Autenticación",
                    secondaryText: "✅ Fecha verificada. Ahora di tu número sindicalizado",
                    hintText: "Di tu número de sindicalizado"
                };

                const directive = await createDirectivePayloadWithAPI("authenticationDocument", extraData);

                return handlerInput.responseBuilder
                    .speak(speakOutput)
                    .reprompt('Dime tu número sindicalizado.')
                    .addDirective(directive)
                    .getResponse();
            } else {
                console.log(`❌ Fecha de nacimiento no encontrada: ${fechaNacimiento}`);
                
                const speakOutput = 'Fecha no encontrada. Verifica que sea correcta y vuelve a intentarlo.';

                const extraData = {
                    primaryText: "Autenticación",
                    secondaryText: "❌ Fecha no encontrada. Intenta de nuevo",
                    hintText: "Verifica tu fecha de nacimiento"
                };

                const directive = await createDirectivePayloadWithAPI("authenticationDocument", extraData);

                return handlerInput.responseBuilder
                    .speak(speakOutput)
                    .reprompt('Dime tu fecha correcta.')
                    .addDirective(directive)
                    .getResponse();
            }
            
        } catch (error) {
            console.error('Error al verificar fecha de nacimiento:', error);
            
            const errorMessage = 'Error de conexión. Intenta más tarde.';
            
            return handlerInput.responseBuilder
                .speak(errorMessage)
                .shouldEndSession(true)
                .getResponse();
        }
    }
};

const CapturarNumeroSindicalizadoHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'CapturarNumeroSindicalizadoIntent';
    },
    async handle(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        
        if (sessionAttributes.userAuthenticated) {
            return await DashboardHandler.handle(handlerInput);
        }
        
        if (!sessionAttributes.fechaNacimientoVerificada) {
            const speakOutput = 'Primero necesito tu fecha de nacimiento.';
            
            const extraData = {
                primaryText: "Autenticación",
                secondaryText: "Primero necesito tu fecha de nacimiento",
            };

            const directive = await createDirectivePayloadWithAPI("authenticationDocument", extraData);

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt('Dime tu fecha de nacimiento.')
                .addDirective(directive)
                .getResponse();
        }
        
        try {
            const numeroSindicalizado = Alexa.getSlotValue(handlerInput.requestEnvelope, 'numeroSindicalizado');
            
            if (!numeroSindicalizado) {
                const speakOutput = 'No entendí tu número. Repite tu número sindicalizado.';
                
                const extraData = {
                    primaryText: "Autenticación",
                    secondaryText: "Número no reconocido, intenta de nuevo",
                    hintText: "Di tu número de sindicalizado"
                };

                const directive = await createDirectivePayloadWithAPI("authenticationDocument", extraData);

                return handlerInput.responseBuilder
                    .speak(speakOutput)
                    .reprompt('Dime tu número sindicalizado.')
                    .addDirective(directive)
                    .getResponse();
            }
            
            console.log(`🔍 Verificando usuario completo - Número: ${numeroSindicalizado}, Fecha: ${sessionAttributes.fechaNacimientoVerificada}`);
            
            const response = await axios.post(API_AUTH_COMPLETO_URL, {
                numeroSindicalizado: parseInt(numeroSindicalizado),
                fechaNacimiento: sessionAttributes.fechaNacimientoVerificada
            }, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Alexa-Skill-SUTUTEH/1.0',
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.data.autorizado) {
                sessionAttributes.userAuthenticated = true;
                sessionAttributes.userName = response.data.nombreCorto || response.data.nombreCompleto || `Agremiado ${numeroSindicalizado}`;
                sessionAttributes.numeroSindicalizado = numeroSindicalizado;
                delete sessionAttributes.fechaNacimientoVerificada;
                handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
                
                console.log(`✅ Usuario autorizado: ${sessionAttributes.userName}`);
                
                const speakOutput = `¡Bienvenido ${sessionAttributes.userName}! Acceso autorizado.`;

                const extraData = {
                    primaryText: "Dashboard",
                    secondaryText: `Bienvenido ${sessionAttributes.userName}`,
                    hintText: "Presiona 'Noticias' o 'Reuniones'"
                };

                const directive = await createDirectivePayloadWithAPI("dashboardDocument", extraData);

                return handlerInput.responseBuilder
                    .speak(speakOutput)
                    .reprompt('Selecciona noticias o reuniones.')
                    .addDirective(directive)
                    .getResponse();
            } else {
                console.log(`❌ Acceso denegado - Número: ${numeroSindicalizado}, Fecha: ${sessionAttributes.fechaNacimientoVerificada}`);
                
                delete sessionAttributes.fechaNacimientoVerificada;
                handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
                
                const speakOutput = 'Acceso denegado. Datos incorrectos.';

                return handlerInput.responseBuilder
                    .speak(speakOutput)
                    .shouldEndSession(true)
                    .getResponse();
            }
            
        } catch (error) {
            console.error('Error al verificar usuario completo:', error);
            
            delete sessionAttributes.fechaNacimientoVerificada;
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
            
            const errorMessage = 'Error de conexión. Intenta más tarde.';
            
            return handlerInput.responseBuilder
                .speak(errorMessage)
                .shouldEndSession(true)
                .getResponse();
        }
    }
};

const DashboardHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "DashboardIntent";
  },
  async handle(handlerInput) {
    if (!isUserAuthenticated(handlerInput)) {
        return requestAuthentication(handlerInput);
    }
    
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const userName = sessionAttributes.userName || '';
    
    const speakOutput = `Hola ${userName}. Selecciona noticias o reuniones.`;
    
    const extraData = {
      primaryText: "Dashboard",
      secondaryText: `Bienvenido ${userName}`,
      hintText: "Presiona 'Noticias' o 'Reuniones'"
    };

    const directive = await createDirectivePayloadWithAPI("dashboardDocument", extraData);

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt("Selecciona noticias o reuniones.")
      .addDirective(directive)
      .getResponse();
  }
};
const OptionOneHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "OptionOneIntent";
  },
  async handle(handlerInput) {
    console.log("🎯 OptionOneHandler activado - Obteniendo noticias reales...");
    
    if (!isUserAuthenticated(handlerInput)) {
        return requestAuthentication(handlerInput);
    }
    
    try {
        const response = await axios.get(API_NOTICIAS_SEMANA_URL, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Alexa-Skill-SUTUTEH/1.0'
            }
        });
        
        const data = response.data;
        const noticias = data.noticias || [];
        
        console.log(`📊 Noticias encontradas: ${noticias.length}`);
        
        if (!noticias || noticias.length === 0) {
            const speakOutput = 'No hay noticias esta semana.';
            
            const extraData = {
                primaryText: "Noticias",
                secondaryText: "No hay noticias de esta semana",
                hintText: "Presiona 'Dashboard' para volver",
                noticiasData: []
            };

            const directive = await createDirectivePayloadWithAPI("option1Document", extraData);
            
            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt('Presiona dashboard para volver.')
                .addDirective(directive)
                .getResponse();
        }
        
        let speakOutput = `${noticias.length} noticias esta semana. `;
        
        // Leer las primeras 2 noticias con fecha
        const noticiasParaLeer = noticias.slice(0, 2);
        
        noticiasParaLeer.forEach((noticia, index) => {
            speakOutput += `Noticia ${index + 1}: ${noticia.titulo}. `;
            const fecha = new Date(noticia.fecha_publicacion);
            speakOutput += `Publicada el ${formatearFecha(fecha)}. `;
        });
        
        // Agregar mensaje de la página web
        speakOutput += 'Para más información sobre noticias de esta semana consulta en la página sututeh.com';
        
        if (noticias.length > 2) {
            speakOutput += `. Hay ${noticias.length - 2} noticias más en pantalla.`;
        }
        
        // Preparar datos para APL
        const noticiasAPL = noticias.map(noticia => ({
            titulo: noticia.titulo,
            fecha: formatearFecha(new Date(noticia.fecha_publicacion))
        }));
        
        const extraData = {
            primaryText: "Noticias de Esta Semana",
            secondaryText: `${noticias.length} noticias encontradas`,
            hintText: "Presiona 'Dashboard' para volver",
            noticiasData: noticiasAPL
        };

        const directive = await createDirectivePayloadWithAPI("option1Document", extraData);
        
        console.log("✅ Pantalla option1Document con noticias reales enviada");
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt('Presiona dashboard para volver.')
            .addDirective(directive)
            .getResponse();
            
    } catch (error) {
        console.error('❌ Error al obtener noticias:', error);
        
        const speakOutput = 'Error al cargar noticias.';
        
        const extraData = {
            primaryText: "Noticias",
            secondaryText: "Error al cargar noticias",
            hintText: "Presiona 'Dashboard' para volver",
            noticiasData: []
        };

        const directive = await createDirectivePayloadWithAPI("option1Document", extraData);
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt('Presiona dashboard para volver.')
            .addDirective(directive)
            .getResponse();
    }
  }
};

const OptionTwoHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "OptionTwoIntent";
  },
  async handle(handlerInput) {
    console.log("🎯 OptionTwoHandler activado - Obteniendo reuniones reales...");
    
    if (!isUserAuthenticated(handlerInput)) {
        return requestAuthentication(handlerInput);
    }
    
    try {
        const response = await axios.get(API_REUNIONES_FUTURAS_URL, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Alexa-Skill-SUTUTEH/1.0'
            }
        });
        
        const data = response.data;
        const reuniones = data.reuniones || [];
        
        console.log(`📊 Reuniones encontradas: ${reuniones.length}`);
        
        if (!reuniones || reuniones.length === 0) {
            const speakOutput = 'No hay reuniones programadas.';
            
            const extraData = {
                primaryText: "Reuniones",
                secondaryText: "No hay reuniones programadas",
                hintText: "Presiona 'Dashboard' para volver",
                reunionesData: []
            };

            const directive = await createDirectivePayloadWithAPI("option2Document", extraData);
            
            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt('Presiona dashboard para volver.')
                .addDirective(directive)
                .getResponse();
        }
        
        let speakOutput = `${reuniones.length} reuniones este mes. `;
        
        // Leer las primeras 2 reuniones con todos los detalles
        const reunionesParaLeer = reuniones.slice(0, 2);
        
        reunionesParaLeer.forEach((reunion, index) => {
            speakOutput += `Reunión ${index + 1}: ${reunion.title}. `;
            
            const fechaString = reunion.date.split('T')[0];
            const fecha = new Date(fechaString + 'T' + reunion.time);
            
            speakOutput += `${formatearFechaReunion(fecha)}, a las ${formatearHora(reunion.time)}. `;
            
            if (reunion.location) {
                speakOutput += `Ubicación: ${reunion.location}. `;
            }
        });
        
        // Agregar mensaje de la página web
        speakOutput += 'Para más información sobre reuniones consulta en la página sututeh.com';
        
        if (reuniones.length > 2) {
            speakOutput += `. Hay ${reuniones.length - 2} reuniones más en pantalla.`;
        }
        
        // Preparar datos para APL
        const reunionesAPL = reuniones.map(reunion => {
            const fechaString = reunion.date.split('T')[0];
            const fecha = new Date(fechaString + 'T' + reunion.time);
            return {
                titulo: reunion.title,
                fecha: formatearFechaReunion(fecha),
                hora: formatearHora(reunion.time),
                tipo: reunion.type
            };
        });
        
        const extraData = {
            primaryText: "Reuniones del Mes",
            secondaryText: `${reuniones.length} reuniones programadas`,
            hintText: "Presiona 'Dashboard' para volver",
            reunionesData: reunionesAPL
        };

        const directive = await createDirectivePayloadWithAPI("option2Document", extraData);
        
        console.log("✅ Pantalla option2Document con reuniones reales enviada");
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt('Presiona dashboard para volver.')
            .addDirective(directive)
            .getResponse();
            
    } catch (error) {
        console.error('❌ Error al obtener reuniones:', error);
        
        const speakOutput = 'Error al cargar reuniones.';
        
        const extraData = {
            primaryText: "Reuniones",
            secondaryText: "Error al cargar reuniones",
            hintText: "Presiona 'Dashboard' para volver",
            reunionesData: []
        };

        const directive = await createDirectivePayloadWithAPI("option2Document", extraData);
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt('Presiona dashboard para volver.')
            .addDirective(directive)
            .getResponse();
    }
  }
};

// ===== HANDLERS DE EVENTOS APL CORREGIDO =====

const UserEventHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'Alexa.Presentation.APL.UserEvent';
    },
    async handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const userEventArguments = request.arguments;
        
        console.log('🎮 UserEvent recibido:', userEventArguments);
        
        if (userEventArguments && userEventArguments.length > 0) {
            const eventType = userEventArguments[0];
            
            switch (eventType) {
                // ✅ DESDE WELCOME: Presionar "Continuar" → Ir a AUTENTICACIÓN
                case 'continuar':
                case 'continue':
                case 'continue_to_dashboard':
                    console.log('🔄 Navegando a autenticación desde welcome');
                    return await AuthenticationHandler.handle(handlerInput);
                
                // ✅ Desde dashboardDocument - ir a noticias
                case 'option_1':
                case 'noticias':
                    console.log('🔄 Navegando a noticias desde dashboard');
                    return await OptionOneHandler.handle(handlerInput);
                
                // ✅ Desde dashboardDocument - ir a reuniones  
                case 'option_2':
                case 'reuniones':
                    console.log('🔄 Navegando a reuniones desde dashboard');
                    return await OptionTwoHandler.handle(handlerInput);
                
                // ✅ Desde option1Document/option2Document - volver al dashboard
                case 'back_to_dashboard':
                case 'dashboard':
                case 'atras':
                case 'volver':
                    console.log('🔄 Navegando de vuelta al dashboard');
                    return await DashboardHandler.handle(handlerInput);
                    
                default:
                    console.log(`🔄 Evento no reconocido: ${eventType}, dirigiendo a autenticación`);
                    return await AuthenticationHandler.handle(handlerInput);
            }
        }
        
        // Si no hay argumentos válidos, redirigir a autenticación
        console.log('🔄 Sin argumentos válidos, dirigiendo a autenticación');
        return await AuthenticationHandler.handle(handlerInput);
    }
};
// ===== HANDLERS ADICIONALES =====

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Asistente SUTUTEH. Puedes consultar noticias o reuniones. ' +
            'Primero necesito tu fecha de nacimiento y número sindicalizado.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = '¡Hasta luego! Gracias por usar SUTUTEH.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'No entendí. Di "noticias" o "reuniones".';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`~~~~ Sesión terminada: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        return handlerInput.responseBuilder.getResponse();
    }
};

const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `Activaste ${intentName}. Para usar el asistente del Sindicato SUTUTEH, ` +
            'di "noticias" o "reuniones".';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const speakOutput = 'Error. Intenta de nuevo.';
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

// ===== INTERCEPTORS =====

const LoggingRequestInterceptor = {
    process(handlerInput) {
        console.log(`Incoming request: ${JSON.stringify(handlerInput.requestEnvelope)}`);
    }
};

const LoggingResponseInterceptor = {
    process(handlerInput, response) {
        console.log(`Outgoing response: ${JSON.stringify(response)}`);
    }
};

// ===== EXPORTAR SKILL BUILDER =====

exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        AuthenticationHandler,
        CapturarFechaNacimientoHandler,
        CapturarNumeroSindicalizadoHandler,
        DashboardHandler,
        OptionOneHandler,
        OptionTwoHandler,
        UserEventHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler
    )
    .addErrorHandlers(ErrorHandler)
    .addRequestInterceptors(LoggingRequestInterceptor)
    .addResponseInterceptors(LoggingResponseInterceptor)
    .withCustomUserAgent('sample/hello-world/v1.2')
    .lambda();
