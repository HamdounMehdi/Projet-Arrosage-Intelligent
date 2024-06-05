document.addEventListener("DOMContentLoaded", () => {
  const manuelButton = document.getElementById("manuel");
  const autoButton = document.getElementById("auto");
  const startButton = document.getElementById("start");
  const stopButton = document.getElementById("stop");
  const modeIndicator = document.getElementById("modeIndicator");
  const statusContent = document.getElementById("status");
  const countdownIndicator = document.getElementById("countdown");

  function initializeMode() {
    fetchAPI("http://localhost:3000/status", { method: "GET" })
      .then((data) => {
        updateUIBasedOnMode(data.modeAuto);
        updateStatusContent(data);
      })
      .catch((error) => {
        console.error(
          "Erreur lors de la récupération du statut initial",
          error
        );
      });
  }

  function updateUIBasedOnMode(isAutomatic) {
    if (isAutomatic) {
      autoButton.disabled = true;
      manuelButton.disabled = false;
      startButton.disabled = true;
      stopButton.disabled = true;
      modeIndicator.textContent = "Mode actuel : automatique";
    } else {
      manuelButton.disabled = true;
      autoButton.disabled = false;
      startButton.disabled = false;
      stopButton.disabled = true;
      modeIndicator.textContent = "Mode actuel : manuel";
    }
  }

  function updateStatusContent(data) {
    statusContent.textContent = `Status de l'arrosage : ${
      data.arrosageActif ? "Actif" : "Inactif"
    }`;
    const mode = data.modeAuto ? "automatique" : "manuel";
    modeIndicator.textContent = `Mode actuel : ${mode}`;
  }

  function fetchAPI(url, options) {
    return fetch(url, options)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Erreur lors de l'appel de l'API: ${response.statusText}`
          );
        }
        return response.json();
      })
      .catch((error) => {
        console.error(error);
        throw error;
      });
  }

  function triggerAutoManu(mode) {
    fetchAPI(`http://localhost:3000/${mode}`, { method: "POST" })
      .then((data) => {
        updateUIBasedOnMode(mode === "auto");
        updateStatusContent(data);
      })
      .catch((error) => {
        console.error("Erreur lors du changement du mode", error);
      });
  }

  function start() {
    disableControls(5000, () => {
      stopButton.disabled = false;
      startButton.disabled = true;
    });
    fetchAPI("http://localhost:3000/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "activate" }),
    })
      .then((data) => {
        alert(data.message);
        fetchAPI("http://localhost:3000/status", { method: "GET" }).then(
          (data) => {
            updateStatusContent(data);
          }
        );
      })
      .catch(() => {
        startButton.disabled = false;
        stopButton.disabled = true;
      });
  }

  function stop() {
    disableControls(5000, () => {
      startButton.disabled = false;
      stopButton.disabled = true;
    });
    fetchAPI("http://localhost:3000/stop", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "deactivate" }),
    })
      .then((data) => {
        alert(data.message);
        fetchAPI("http://localhost:3000/status", { method: "GET" }).then(
          (data) => {
            updateStatusContent(data);
          }
        );
      })
      .catch(() => {
        stopButton.disabled = false;
        startButton.disabled = true;
      });
  }

  function disableControls(delay, callback) {
    startButton.disabled = true;
    stopButton.disabled = true;
    let counter = delay / 1000;

    countdownIndicator.textContent = `Veuillez attendre ${counter} secondes...`;
    const interval = setInterval(() => {
      counter--;
      countdownIndicator.textContent = `Veuillez attendre ${counter} secondes...`;
      if (counter <= 0) {
        clearInterval(interval);
        countdownIndicator.textContent = "";
        callback();
      }
    }, 1000);
  }

  manuelButton.addEventListener("click", () => {
    triggerAutoManu("manuel");
    startButton.disabled = false;
    stopButton.disabled = true;
  });

  autoButton.addEventListener("click", () => {
    triggerAutoManu("auto");
    startButton.disabled = true;
    stopButton.disabled = true;
  });

  startButton.addEventListener("click", () => {
    start();
  });

  stopButton.addEventListener("click", () => {
    stop();
  });

  initializeMode();

  const socket = io("http://localhost:3000");
  socket.on("connect", () => {
    console.log("Connecté au serveur");

    socket.on("arrosageMode", (data) => {
      console.log("Changement de mode d'arrosage détecté", data);
      updateStatusContent(data);
      updateUIBasedOnMode(data.modeAuto);
    });

    socket.on("arrosageStatus", (data) => {
      console.log("Changement de statut de l'arrosage détecté", data);
      updateStatusContent(data);
    });
  });
});

