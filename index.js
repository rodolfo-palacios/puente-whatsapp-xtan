const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const express = require('express');
const http = require('http'); // Añadimos módulo nativo de Node
const app = express();
app.use(express.json());

let sock = null;

async function conectarWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('sesion_colectivo');
    
    sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: require('pino')({ level: 'silent' }),
        // Forzamos un agente HTTP persistente con tiempos de espera largos
        keepAliveIntervalMs: 30000,
        connectTimeoutMs: 60000,
        options: {
            agent: new http.Agent({ keepAlive: true, timeout: 60000 })
        }
    });
    
    if (!sock.authState.creds.registered) {
        const numeroTelefono = "5219191286566";
        
        // Esperamos 15 segundos completos antes de pedir el código para asegurar que el túnel de Render esté al 100%
        setTimeout(async () => {
            try {
                console.log("-----------------------------------------");
                console.log(`📡 Intentando enlace forzado para: ${numeroTelefono}`);
                const code = await sock.requestPairingCode(numeroTelefono);
                console.log("=========================================");
                console.log(`👉 TU CÓDIGO DE VINCULACIÓN ES: ${code}`);
                console.log("=========================================");
            } catch (err) {
                console.log("❌ Error de red temporal en Render:", err.message);
            }
        }, 15000);
    }
    
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const deberiaReconectar = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('🔄 Reestabilizando canal de red...');
            if (deberiaReconectar) {
                // Esperamos 10 segundos antes de reintentar para no saturar
                setTimeout(() => conectarWhatsApp(), 10000);
            }
        } else if (connection === 'open') {
            console.log('✅ ¡WhatsApp conectado exitosamente para el Colectivo Xtan!');
        }
    });
}

app.post('/enviar-alerta', async (req, res) => {
    const { telefono, mensaje } = req.body;
    if (!sock) return res.status(500).json({ error: "Servidor no listo" });
    try {
        const idJid = `${telefono}@s.whatsapp.net`;
        await sock.sendMessage(idJid, { text: mensaje });
        res.status(200).json({ status: 'Alerta enviada' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

conectarWhatsApp();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Puente escuchando en puerto ${PORT}`));
