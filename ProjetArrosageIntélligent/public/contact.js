const nom = document.querySelector("#nomInput");
const prenom = document.querySelector("#prenomInput");
const email = document.querySelector("#emailInput");
const sujet = document.querySelector("#sujetInput");
const tel = document.querySelector("#telInput");
const message = document.querySelector("#messageTextArea");

/*---------------- Variables de Validation ---------------------------*/
let nomValid = false;
let prenomValid = false;
let emailValid = false;
let sujetValid = false;
let telValid = false;
let messageValid = false;

const userRegex = /^[a-zA-Z-]{3,23}$/;
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const phoneNumberRegex = /^\+(?:\d{1,3})?\d{10}$/;
const sujetRegex = /^[^<>{}$]{3,200}$/;
const messageRegex = /^[a-zA-Z0-9 .,?!'"()&+-@#%^*_=]*$/;

function addClass(element, regex, value) {
  if (regex.test(value)) {
    element.classList.add("is-valid");
    element.classList.remove("is-invalid");
  } else {
    element.classList.remove("is-valid");
    element.classList.add("is-invalid");
  }
}

nom.addEventListener("input", (e) => {
  addClass(nom, userRegex, e.target.value);
  nomValid = nom.classList.contains("is-valid");
});

prenom.addEventListener("input", (e) => {
  addClass(prenom, userRegex, e.target.value);
  prenomValid = prenom.classList.contains("is-valid");
});

email.addEventListener("input", (e) => {
  addClass(email, emailRegex, e.target.value);
  emailValid = email.classList.contains("is-valid");
});

sujet.addEventListener("input", (e) => {
  addClass(sujet, sujetRegex, e.target.value);
  sujetValid = sujet.classList.contains("is-valid");
});

tel.addEventListener("input", (e) => {
  let telnumber = e.target.value;
  telnumber = telnumber.replace(/\s/g, "");
  telnumber = telnumber.replace(/^0/, "+33");

  addClass(tel, phoneNumberRegex, telnumber);
  telValid = tel.classList.contains("is-valid");
});

message.addEventListener("input", (e) => {
  addClass(message, messageRegex, e.target.value);
  messageValid = message.classList.contains("is-valid");
});

const submit = document.getElementsByClassName("form-contact")[0];

submit.addEventListener("submit", (e) => {
  e.preventDefault();
  if (
    nomValid &&
    prenomValid &&
    emailValid &&
    sujetValid &&
    telValid &&
    messageValid
  ) {
    let infoContact = {
      name: nom.value,
      surname: prenom.value,
      mail: email.value,
      subject: sujet.value,
      phone: tel.value,
      description: message.value,
    };

    Email.send({
      SecureToken: "63c2a8db-50f5-4d45-a672-796049c26da6",
      To: "p.arrosage@gmail.com",
      From: "p.arrosage@gmail.com",
      Subject: infoContact.subject,
      Body: `${infoContact.surname}, ${infoContact.name}, ${infoContact.mail}, ${infoContact.phone}, ${infoContact.description}.`,
    }).then((message) => {
      alert(
        "Message envoyé avec succès. Vous serez contacté dans les plus brefs délais."
      );
      submit.reset(); // Réinitialiser le formulaire après l'envoi du message
      resetValidationStates(); // Réinitialiser les états de validation
    });
  } else {
    alert(
      "Tous les champs ne sont pas rentrés ou ne sont pas valides, merci de rentrer correctement les champs du formulaire"
    );
  }
});

function resetValidationStates() {
  nom.classList.remove("is-valid", "is-invalid");
  prenom.classList.remove("is-valid", "is-invalid");
  email.classList.remove("is-valid", "is-invalid");
  sujet.classList.remove("is-valid", "is-invalid");
  tel.classList.remove("is-valid", "is-invalid");
  message.classList.remove("is-valid", "is-invalid");

  nomValid = false;
  prenomValid = false;
  emailValid = false;
  sujetValid = false;
  telValid = false;
  messageValid = false;
}
