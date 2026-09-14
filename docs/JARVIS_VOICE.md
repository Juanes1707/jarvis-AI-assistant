# JARVIS: voz y órdenes

## Probar en Expo Go

Recarga la app, abre la pestaña JARVIS y pulsa **Hablar con JARVIS**. En Android se abre el dictado del sistema y su texto vuelve al chat. JARVIS lee la propuesta. Pulsa otra vez el micrófono y di **confirmar** o **cancelar**; también puedes usar los botones de la tarjeta.

El botón **Voz** permite probar y elegir una voz instalada en español o silenciar respuestas. El perfil usa tono grave y ritmo pausado (pitch 0.88, rate 0.94); el timbre y calidad dependen del teléfono. No es una grabación ni clon de un actor. Cambiar de pestaña, abandonar la app o empezar a dictar detiene la lectura. No escucha en segundo plano.

## Órdenes disponibles

| Ejemplo | Resultado tras confirmar |
|---|---|
| Agrega un gasto de cien mil pesos hoy | Gasto de $100.000 COP en la fecha actual de Bogotá |
| Agrega un gasto de 100.000 persos al día de hoy | Acepta también el error tipográfico del ejemplo original |
| Gasté treinta y dos mil pesos ayer en almuerzo | Gasto de $32.000, categoría alimentación, fecha de ayer |
| Registra un ingreso de dos millones hoy | Ingreso de $2.000.000 COP |
| Registra un gasto de 100.000,50 pesos el 2026-09-10 | Conserva los 50 centavos y usa la fecha indicada, si no es futura |
| Crea una tarea llamada repasar integrales | Tarea Inbox sin materia/fecha; estimación inicial visible de 30 minutos |
| Inicia la tarea entregar consultas SQL | Pasa a en curso conservando el progreso |
| Completa la tarea taller de Lagrange | Marca esa tarea como completada al 100% |
| Marca el hábito alemán hoy | Completa el hábito en la fecha actual, sin desmarcarlo al repetir |
| Mis finanzas / Tareas pendientes | Consulta el estado sin escribir datos |

El intérprete es local y determinista, con una acción por mensaje. Si una orden no coincide con las formas admitidas, pide reformularla; no se interpreta como código ni SQL. Los títulos ambiguos requieren precisar la tarea. Las nuevas órdenes no sustituyen la propuesta pendiente: primero se confirma o cancela. Los importes cero, negativos, fuera del entero SQLite y los formatos ambiguos se rechazan.

Los movimientos admiten hoy, ayer, anteayer o una fecha ISO ya ocurrida. Las tareas se crean en Inbox; fechas, materia y otros detalles pueden editarse desde Tareas. No modifica notas, exámenes, presupuestos, eventos ni elimina registros mediante voz en esta versión.

## Compatibilidad y datos

- Android: expo-intent-launcher abre ACTION_RECOGNIZE_SPEECH y devuelve android.speech.extra.RESULTS. Requiere un servicio de reconocimiento instalado. Puede usar Internet y procesar el audio con el proveedor del sistema; la app no guarda grabaciones.
- iPhone: en Expo Go se usa el micrófono del teclado y después Enviar. La respuesta se lee con expo-speech; el dispositivo debe tener desactivado el modo silencio.
- No requiere claves de IA ni backend. Ambos módulos están incluidos en Expo Go del SDK usado.
- SQLite v3 guarda la acción y su recibo en una sola transacción. Repetir la misma confirmación, incluso después de reiniciar o de fallar la recarga de UI, no duplica el movimiento. La conversación mantiene hasta 40 mensajes en memoria y no se restaura al cerrar la app.
- Las preferencias de voz viven en AsyncStorage y se incorporan a las preferencias antiguas sin perder ajustes. El calendario y los resúmenes usan la fecha real de Bogotá; los datos iniciales siguen siendo ejemplos de septiembre de 2026.

## Comprobación pendiente en dispositivo

1. Abrir JARVIS y usar Voz → Probar voz; probar silenciar y detener una respuesta.
2. Dictar «agrega un gasto de cien mil pesos hoy». Comprobar importe y fecha antes de confirmar.
3. Confirmar por voz y verificar el gasto, saldo y presupuesto en Finanzas.
4. Cerrar y volver a abrir la app; comprobar que el gasto siga una sola vez.
5. Cancelar otra propuesta y cerrar el dictado con Atrás; comprobar que no aparezca otro gasto.
6. Probar teclado, tamaño de letra grande, cambio de pestaña y permiso/servicio de voz no disponible.

Pruebas automatizadas simulan los resultados del dictado y callbacks de voz; no validan el micrófono, el sonido ni la fidelidad visual del teléfono.

Referencias: [Expo Speech](https://docs.expo.dev/versions/latest/sdk/speech/), [Expo IntentLauncher](https://docs.expo.dev/versions/latest/sdk/intent-launcher/), [Android RecognizerIntent](https://developer.android.com/reference/android/speech/RecognizerIntent).
