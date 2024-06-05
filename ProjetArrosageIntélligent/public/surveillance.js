document.addEventListener("DOMContentLoaded", function () {
  const humiditeValeur = document.getElementById("humidite-valeur");
  const eauValeur = document.getElementById("eau-valeur");
  const humiditeProgress = document.getElementById("humidite-progress");
  const eauProgress = document.getElementById("eau-progress");
  const socket = io();

  // Graphiques
  const humiditeCtx = document.getElementById("humiditeChart").getContext("2d");
  const eauCtx = document.getElementById("eauChart").getContext("2d");

  let humiditeChart = new Chart(humiditeCtx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Humidité du Sol",
          data: [],
          backgroundColor: "rgba(54, 162, 235, 0.2)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });

  let eauChart = new Chart(eauCtx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Niveau d'Eau",
          data: [],
          backgroundColor: "rgba(255, 99, 132, 0.2)",
          borderColor: "rgba(255, 99, 132, 1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });

  // Initialisation des données à partir du serveur
  function init() {
    fetch("/donnees/humidite")
      .then((response) => response.json())
      .then((data) => {
        if (data.length > 0) {
          const latestHumidite = data[0]; // Le plus récent en premier
          humiditeValeur.textContent = `Humidité: ${latestHumidite.Taux}%`;
          updateProgressBar(humiditeProgress, latestHumidite.Taux);
          updateHumiditeChart(data);
        } else {
          humiditeValeur.textContent = "Aucune donnée disponible.";
        }
      })
      .catch((error) => {
        console.error(
          "Erreur lors de la récupération des données d'humidité:",
          error
        );
        humiditeValeur.textContent =
          "Erreur lors de la récupération des données.";
      });

    fetch("/donnees/niveauEau")
      .then((response) => response.json())
      .then((data) => {
        if (data.length > 0) {
          const latestEau = data[0]; // Le plus récent en premier
          let percentage = convertNiveauEauToPercentage(latestEau.Distance);
          eauValeur.textContent = `Niveau d'eau: ${percentage}%`;
          updateProgressBar(eauProgress, percentage);
          updateEauChart(data);
        } else {
          eauValeur.textContent = "Aucune donnée disponible.";
        }
      })
      .catch((error) => {
        console.error(
          "Erreur lors de la récupération des données de niveau d'eau:",
          error
        );
        eauValeur.textContent = "Erreur lors de la récupération des données.";
      });
  }

  function updateProgressBar(progressBar, value) {
    let className = "";
    if (value < 30) className = "low";
    else if (value < 70) className = "medium";
    else className = "high";

    progressBar.className = `progressbar ${className}`;
    progressBar.style.width = `${value}%`;
  }

  function updateHumiditeChart(data) {
    humiditeChart.data.labels = data.map((item) =>
      new Date(item.Time).toLocaleTimeString()
    );
    humiditeChart.data.datasets[0].data = data.map((item) => item.Taux);
    humiditeChart.update();
  }

  function updateEauChart(data) {
    eauChart.data.labels = data.map((item) =>
      new Date(item.Time).toLocaleTimeString()
    );
    eauChart.data.datasets[0].data = data.map((item) =>
      convertNiveauEauToPercentage(item.Distance)
    );
    eauChart.update();
  }
  function convertNiveauEauToPercentage(value) {
    const volumeEnLitres = (value * 1.2) / 1000; // Convertir mm en litres
    value = volumeEnLitres * 100; // Convertir en pourcentage de la capacité totale de la cuve de 1000L
    value = Math.round(value); // Arrondir au nombre entier le plus proche
    return Math.min(Math.max(value, 0), 100); // Garantir que la valeur est entre 0 et 100
  }

  socket.on("humidite", function (data) {
    if (data) {
      humiditeValeur.textContent = `Humidité: ${data.humidite}%`;
      updateProgressBar(humiditeProgress, data.humidite);
      humiditeChart.data.labels.push(new Date().toLocaleTimeString());
      humiditeChart.data.datasets[0].data.push(data.humidite);
      humiditeChart.update();
    } else {
      humiditeValeur.textContent = "Aucune donnée disponible.";
    }
  });

  socket.on("eau", function (data) {
    if (data) {
      let percentage = convertNiveauEauToPercentage(data.niveauEau);
      eauValeur.textContent = `Niveau d'eau: ${percentage}%`;
      updateProgressBar(eauProgress, percentage);
      eauChart.data.labels.push(new Date().toLocaleTimeString());
      eauChart.data.datasets[0].data.push(percentage);
      eauChart.update();
    } else {
      eauValeur.textContent = "Aucune donnée disponible.";
    }
  });

  // Appel initial pour charger les données dès le chargement de la page
  init();
});