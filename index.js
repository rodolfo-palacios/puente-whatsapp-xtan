const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// Tu token de BotFather ya ingresado de forma segura
const TELEGRAM_TOKEN = '8801028896:AAEoMp8Hbw-qHElNbD7R1iN58QJZ0I4Ui0Q'; 

// REEMPLAZA LO QUE ESTÁ ENTRE COMILLAS CON EL ENLACE QUE ELIGISTE EN EL PASO 1 (MANTÉN EL @)
const CANAL_CHAT_ID = '@EL_ENLACE_QUE_ELEGISTE'; 

app.post('/enviar-alerta', async (req, res) => {
    const { mensaje } = req.body;
    
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
        
        await axios.post(url, {
            chat_id: CANAL_CHAT_ID,
            text: mensaje,
            parse_mode: 'Markdown'
        });

        console.log("✅ Alerta enviada a Telegram correctamente");
        res.status(200).json({ status: 'Alerta enviada a Telegram' });
    } catch (err) {
        console.error("❌ Error al enviar a Telegram:", err.response?.data || err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get('/', (req, res) => {
    res.send('🚀 Servidor de alertas de Telegram activo.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Puente escuchando en puerto ${PORT}`));
