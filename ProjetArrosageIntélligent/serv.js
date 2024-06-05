const express = require('express');
const http = require('http');
const mysql = require('mysql2');
const mqtt = require('mqtt');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const server = http.createServer(app);
const io = require("socket.io")(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

const dbConnection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "arrosageAuto",
});

const mqttOptions = {
    host: 'eu1.cloud.thethings.network',
    port: 1883,
    username: 'arrosage@ttn',
    password: 'NNSXS.6AF7BMCOHUUM6JT3RU67G55LP3LYDKT3M675HBQ.VGODOEAJOKK43AUM2Z7JPRJWJRUJLFCATNUFZDDZONTT7A6M2ZBA',
};

const mqttClient = mqtt.connect(mqttOptions);

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/surveillance", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "surveillance.html"));
});

app.get("/bouton", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "bouton.html"));
});

app.get("/prevision", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "prevision.html"));
});

app.get("/contact", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "contact.html"));
});

app.get("/donnees/humidite", (req, res) => {
    const sql = "SELECT * FROM Humidite ORDER BY id_humidite DESC LIMIT 10";
    dbConnection.query(sql, (error, results) => {
        if (error) {
            console.error("Erreur lors de la récupération des données :", error);
            res.status(500).json({ error: "Erreur lors de la récupération des données" });
        } else {
            res.json(results);
        }
    });
});

app.get("/donnees/niveauEau", (req, res) => {
    const sql = "SELECT * FROM NiveauEau ORDER BY id_niveau DESC LIMIT 10";
    dbConnection.query(sql, (error, results) => {
        if (error) {
            console.error("Erreur lors de la récupération des données :", error);
            res.status(500).json({ error: "Erreur lors de la récupération des données" });
        } else {
            res.json(results);
        }
    });
});

app.get("/status", (req, res) => {
    res.json({
        arrosageActif,
        modeAuto,
        status: arrosageActif ? "Actif" : "Inactif",
    });
});

app.post("/start", (req, res) => {
    if (!arrosageActif) {
        activerArrosage();
    }
    io.emit("arrosageStatus", { arrosageActif, modeAuto }); // Émettre le statut ici
    res.json({ message: "Arrosage démarré", status: "Actif" });
});

app.post("/stop", (req, res) => {
    if (arrosageActif) {
        arreterArrosage();
    }
    io.emit("arrosageStatus", { arrosageActif, modeAuto }); // Émettre le statut ici
    res.json({ message: "Arrosage arrêté", status: "Inactif" });
});

// Routes pour changer de mode
app.post("/auto", (req, res) => {
    modeAuto = true;
    io.emit("arrosageMode", { modeAuto });
    res.json({ message: "Mode automatique activé", modeAuto });
});

app.post("/manuel", (req, res) => {
    modeAuto = false;
    io.emit("arrosageMode", { modeAuto });
    res.json({ message: "Mode manuel activé", modeAuto });
});


mqttClient.on("connect", () => {
    console.log("Connecté au broker MQTT");
    mqttClient.subscribe("v3/arrosage@ttn/devices/eui-a84041b791868901/up");
    mqttClient.subscribe("v3/arrosage@ttn/devices/eui-a840419d21868903/up");
    mqttClient.subscribe("v3/arrosage@ttn/devices/eui-a8404199a187195f/up");
});

mqttClient.on("message", (topic, message) => {
    const data = JSON.parse(message.toString());

    if (topic === "v3/arrosage@ttn/devices/eui-a84041b791868901/up") {

        const tempSoil = data.uplink_message.decoded_payload.temp_SOIL;
        const waterSoil = data.uplink_message.decoded_payload.water_SOIL;
        console.log(`Information provenant du capteur d'humidité: temp_SOIL: ${tempSoil}, water_SOIL: ${waterSoil}`);

    } else if (topic === "v3/arrosage@ttn/devices/eui-a8404199a187195f/up") {

        const ro1Status = data.uplink_message.decoded_payload.RO1_status;
        const ro2Status = data.uplink_message.decoded_payload.RO2_status;
        console.log(`Information provenant du controleur: RO1_status: ${ro1Status}, RO2_status: ${ro2Status}`);

    } else if (topic === "v3/arrosage@ttn/devices/eui-a840419d21868903/up") {

        const distance = data.uplink_message.decoded_payload.Distance;
        console.log(`Information provenant de capteur du niveau d'eau: Distance: ${distance}`);

    }

    traiterDonnees(data, topic);
});

let arrosageActif = false;
let modeAuto = true;
let hum = null;
let eau = null;
let humUpdated = false;
let eauUpdated = false;
const seuil_hum = 30;
const seuil_eau = 50;

function traiterDonnees(data, topic) {
    if (topic.includes("eui-a84041b791868901")) {
        stockerHum(data);
    } else if (topic.includes("eui-a840419d21868903")) {
        stockerEau(data);
    }
    if (modeAuto && humUpdated && eauUpdated) {
        verifierConditionArrosage();
        humUpdated = false;
        eauUpdated = false;
    }
}

function stockerHum(data) {
    if (data.uplink_message && data.uplink_message.decoded_payload) {
        const { temp_SOIL, water_SOIL } = data.uplink_message.decoded_payload;
        hum = water_SOIL;
        humUpdated = true;
        const sql = "INSERT INTO Humidite (Time, Temperature, Taux) VALUES (NOW(), ?, ?)";
        dbConnection.execute(sql, [temp_SOIL, water_SOIL], (error, results, fields) => {
            if (error) {
                console.error("Erreur lors de l'insertion dans la base de données :", error);
                return;
            }
            io.emit("humidite", { temperature: temp_SOIL, humidite: water_SOIL });
        });
    }
}

function stockerEau(data) {
    if (data.uplink_message && data.uplink_message.decoded_payload) {
        const { Distance } = data.uplink_message.decoded_payload;
        eau = Distance;
        eauUpdated = true;
        const sql = "INSERT INTO NiveauEau (Time, Distance) VALUES (NOW(), ?)";
        dbConnection.execute(sql, [Distance], (error, results, fields) => {
            if (error) {
                console.error("Erreur lors de l'insertion dans la base de données :", error);
                return;
            }
            io.emit("eau", { niveauEau: Distance });
            if (Distance < 50) {
                envoyerMessageWhatsapp("Attention: Le niveau d'eau de la cuve est trop faible.");
            } else if (Distance > 800) {
                envoyerMessageWhatsapp("Attention: Le niveau d'eau de la cuve est trop élevé.");
            }
        });
    }
}

function envoyerMessageWhatsapp(message) {
    const phone = "33768397893";
    const text = encodeURIComponent(message);
    const apikey = "9972576";

    const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${text}&apikey=${apikey}`;

    axios.get(url)
        .then(response => {
            console.log("Notification WhatsApp envoyée : ", response.data);
        })
        .catch(error => {
            console.error("Erreur lors de l'envoi de la notification WhatsApp : ", error);
        });
}

const actualiserPrevisions = () => {
    const apiKey = '64e5114494ef42dca69140247240602';
    const location = 'Clichy, France';
    const url = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${encodeURIComponent(location)}&days=1&aqi=no&alerts=no`;

    axios.get(url)
        .then(response => {
            const data = response.data;
            if (!data.location || data.location.name.toLowerCase() !== location.toLowerCase().split(',')[0]) {
                throw new Error('Localisation non trouvée ou données invalides');
            }

            const currentHour = new Date().getHours();
            const forecast = data.forecast.forecastday[0].hour.slice(currentHour, currentHour + 12);

            let totalRain = 0;
            forecast.forEach(hour => {
                totalRain += hour.precip_mm;
            });

            fs.writeFile(path.join(__dirname, 'prevision_clichy.txt'), totalRain.toFixed(2), (err) => {
                if (err) {
                    return console.error('Erreur lors de l\'écriture dans le fichier:', err);
                }
                console.log('Prévision de pluie sauvegardée dans le fichier prevision_clichy.txt.');
            });
        })
        .catch(error => console.error('Erreur lors de la récupération des données météo:', error));
};


function lirePrevision() {
    try {
        const data = fs.readFileSync(path.join(__dirname, "prevision_clichy.txt"), "utf8");
        return parseFloat(data);
    } catch (error) {
        console.error("Erreur lors de la lecture du fichier de prévision de pluie:", error);
        return null;
    }
}

function activerArrosage() {
    if (!arrosageActif) {
        console.log("Déclenchement de l'arrosage à :", new Date());
        arrosageActif = true;
        io.emit("arrosageStatus", { arrosageActif, modeAuto }); // Émettre le statut ici
        const encodedCommandOn = "AwEA";
        const downlinkPayloadOn = JSON.stringify({
            downlinks: [
                {
                    f_port: 2,
                    frm_payload: encodedCommandOn,
                    confirmed: true,
                },
            ],
        });
        mqttClient.publish("v3/arrosage@ttn/devices/eui-a8404199a187195f/down/push", downlinkPayloadOn, (error) => {
            if (error) {
                console.error("Erreur lors de l'envoi de la commande d'activation d'arrosage", error);
            } else {
                console.log("Commande d'activation d'arrosage envoyée avec succès.");
            }
        });
        setTimeout(() => {
            arreterArrosage();
        }, 120000); // 2 minutes
    } else {
        console.log("Tentative de déclenchement alors que l'arrosage est déjà en cours.");
    }
}

function arreterArrosage() {
    if (arrosageActif) {
        console.log("Arrêt de l'arrosage à :", new Date());
        arrosageActif = false;
        io.emit("arrosageStatus", { arrosageActif, modeAuto }); // Émettre le statut ici
        const encodedCommandOff = "AwDA";
        const downlinkPayloadOff = JSON.stringify({
            downlinks: [
                {
                    f_port: 2,
                    frm_payload: encodedCommandOff,
                    confirmed: true,
                },
            ],
        });
        mqttClient.publish("v3/arrosage@ttn/devices/eui-a8404199a187195f/down/push", downlinkPayloadOff, (error) => {
            if (error) {
                console.error("Erreur lors de l'envoi de la commande de désactivation d'arrosage", error);
            } else {
                console.log("Commande de désactivation d'arrosage envoyée avec succès. Arrosage arrêté.");
            }
        });
    } else {
        console.log("Tentative d'arrêt alors que l'arrosage n'est pas actif.");
    }
}

function verifierConditionArrosage() {
    const previsionPluie = lirePrevision();
    console.log(`Prévision de pluie: ${previsionPluie} mm, Humidité du sol: ${hum}%, Niveau d'eau: ${eau} mm`);

    if (hum === null || eau === null || previsionPluie === null) {
        console.log("Données insuffisantes pour décider de l'arrosage.");
        return;
    }

    if (modeAuto) {
        if (previsionPluie >= 2) {
            console.log("Arrosage non nécessaire en raison des prévisions de pluie élevées.");
        } else if (eau <= seuil_eau) {
            console.log(`Arrosage non nécessaire en raison du niveau d'eau insuffisant (Niveau d'eau: ${eau} mm, Seuil: ${seuil_eau} mm).`);
        } else if (hum >= seuil_hum) {
            console.log(`Arrosage non nécessaire car l'humidité du sol est suffisante (Humidité: ${hum}%, Seuil: ${seuil_hum}%).`);
        } else {
            if (!arrosageActif) {
                activerArrosage();
                console.log("Arrosage automatique en cours.");
            } else {
                console.log("Aucune action nécessaire pour l'arrosage automatique.");
            }
        }
    } else {
        console.log("Arrosage manuel, aucun traitement à prévoir.");
    }
    humUpdated = false;
    eauUpdated = false;
}

server.listen(3000, () => {
    console.log("Le serveur est en cours d'exécution sur le port 3000");
    actualiserPrevisions();
    setInterval(actualiserPrevisions, 7200000);
});