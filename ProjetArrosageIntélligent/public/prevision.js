// const { Chart } = require("chart.js");

document.addEventListener("DOMContentLoaded", function () {
  // Sélection des éléments du DOM
  const elements = {
    meteoActuelles: document.getElementById("infos-actuelles"),
    fuseauHoraire: document.getElementById("fuseau-horaire"),
    paysEl: document.getElementById("pays"),
    previsionMeteo: document.getElementById("prevision-future"),
    tempActuelleEl: document.getElementById("temp-actuelle"),
    previsionHeureEl: document.getElementById("prevision-heure"),
    heureEl: document.getElementById("heure"),
    dateEl: document.getElementById("date"),
  };

  // Interval pour mettre à jour l'heure et la date chaque seconde
  setInterval(updateClockAndDate, 1000);

  // Appel de la fonction pour obtenir les données météo
  obtenirDonneesMeteo();

  // Fonction pour mettre à jour l'heure et la date
  function updateClockAndDate() {
    const dateActuelle = new Date();
    const heure = dateActuelle.getHours();
    const minutes = dateActuelle.getMinutes();

    const heureFormattee = heure.toString().padStart(2, "0");
    const minutesFormattees = minutes.toString().padStart(2, "0");

    // Mise à jour de l'heure et la date dans le DOM
    elements.heureEl.textContent = `${heureFormattee}:${minutesFormattees}`;
    elements.dateEl.textContent = moment().format("dddd, LL");
  }

  let cleAPI = "455aae285446048b45eb0ef674aef144";

  // Fonction pour obtenir les données météo
  function obtenirDonneesMeteo() {
    // Demande de la localisation de l'utilisateur
    navigator.geolocation.getCurrentPosition(
      // Succès de la récupération de la localisation
      (succes) => {
        const { latitude, longitude } = succes.coords;

        // Appel à l'API OpenWeatherMap pour obtenir les données météo
        fetch(
          `https://api.openweathermap.org/data/2.5/onecall?lat=${latitude}&lon=${longitude}&units=metric&appid=${cleAPI}`
        )
          .then((res) => {
            // Vérification de la réponse de l'API
            if (!res.ok) {
              throw new Error(
                "Erreur de réseau lors de la récupération des données météorologiques"
              );
            }
            return res.json();
          })
          .then((donnees) => {
            // Affichage des données météo
            afficherDonneesMeteo(donnees);
          })
          .catch((erreur) => {
            // Gestion des erreurs de récupération des données météo
            console.error(
              "Erreur lors de la récupération des données météorologiques:",
              erreur.message
            );
          });
      },
      // Erreur lors de la récupération de la localisation
      (erreur) => {
        console.error("Erreur lors de la récupération de la position:", erreur);
        // Alerte à afficher si l'utilisateur refuse l'accès à sa localisation
        alert(
          "Vous avez refusé la géolocalisation, pour que l'application fonctionne, merci de l'activer!"
        );
      }
    );
  }

  // Fonction pour afficher les données météo
  function afficherDonneesMeteo(donnees) {
    const { current, timezone, lat, lon, daily, hourly } = donnees;

    // Affichage du fuseau horaire et la position géographique
    elements.fuseauHoraire.textContent = timezone;
    elements.paysEl.textContent = `${lat}N ${lon}E`;

    // Construction du HTML pour les données météo actuelles
    elements.meteoActuelles.appendChild(
      createElementMeteo("Humidité", `${current.humidity}%`)
    );
    elements.meteoActuelles.appendChild(
      createElementMeteo("Pression", `${current.pressure}`)
    );
    elements.meteoActuelles.appendChild(
      createElementMeteo("Vitesse du vent", `${current.wind_speed}`)
    );
    elements.meteoActuelles.appendChild(
      createElementMeteo(
        "Lever du soleil",
        moment.unix(current.sunrise).format("LT")
      )
    );
    elements.meteoActuelles.appendChild(
      createElementMeteo(
        "Coucher du soleil",
        moment.unix(current.sunset).format("LT")
      )
    );

    // Construction du HTML pour les prévisions des jours suivants
    const previsionJoursHTML = daily
      .map(
        (jour) => `
          <div class="element-prevision-meteo">
            <div class="jour">${moment.unix(jour.dt).format("dddd")}</div>
            <img
              src="https://openweathermap.org/img/wn/${
                jour.weather[0].icon
              }.png"
              alt="icône météo"
              class="w-icon"
            />
            <div class="temp">Max - ${jour.temp.max}&#176; C</div>
            <div class="temp">Min - ${jour.temp.min}&#176; C</div>
          </div>
        `
      )
      .join("");
    elements.previsionMeteo.innerHTML = previsionJoursHTML;

    // Construction du HTML pour les prévisions des prochaines heures
    const previsionHeuresHTML = hourly
      .slice(0, 7)
      .map(
        (heure) => `
          <div class="element-prevision-heure">
            <div class="heure">${moment.unix(heure.dt).format("LT")}</div>
            <img
              src="https://openweathermap.org/img/wn/${
                heure.weather[0].icon
              }.png"
              alt="icône météo"
              class="w-icon"
            />
            <div class="pluie">Pluie - ${heure.pop * 100}%</div>
          </div>
        `
      )
      .join("");
    elements.previsionHeureEl.innerHTML = previsionHeuresHTML;
  }
  function createElementMeteo(label, value) {
    const elementMeteo = document.createElement("div");
    elementMeteo.classList.add("element-meteo");
    const labelDiv = document.createElement("div");
    labelDiv.textContent = label;
    const valueDiv = document.createElement("div");
    valueDiv.textContent = value;
    elementMeteo.appendChild(labelDiv);
    elementMeteo.appendChild(valueDiv);
    return elementMeteo;
  }

  $(function () {
    $("#header").load("header.html");
  });
});
