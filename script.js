'use strict';

//How to Plan a Web Project
//Basically plan is divided by 4 steps:

// 1. User stories - description of functionality of app from the user perspective

// 2. Features - based on user story we decide the features that we gonna implemend

// 3. Flowchart - what we will build

// 4. Architecture - How we will build it

//USER STORY:
// We have the following format:
// As a [who? admin, user, etc.] I want [what? an Action], so that [why? A benefit]

//Using the Geolocation API

//It takes two callBack parameters - first one is when succesfully connected and second one is when something get wrong.

class Workout {
  //Public field
  date = new Date();
  id = (Date.now() + '').slice(-10);
  click = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; //Array of lat, lng.
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  clicks() {
    this.click++;
  }
}
//////////////////////////////////////////////////////

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription(); // From Workout class
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

//////////////////////////////////////////////////////

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationgain) {
    super(coords, distance, duration);
    this.elevationgain = elevationgain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

////////////////////////
//Application Architecture

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  #map;
  #mapE; //map event
  #workouts = [];
  #mapZoomLevel = 13;

  // constructor always executed first!
  constructor() {
    //Get user position
    this._getPosition();

    //Get data from local storage
    this._getLocalStorage();

    //Attach event handler
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    navigator.geolocation?.getCurrentPosition(
      //when everything is okay. Since 'get current position will call the 'loadMap' - 'this' will be undefind. So we have to bind 'this'.
      this._loadMap.bind(this),

      //when smth get wrong
      function () {
        alert(`Something is wrong =(`);
      }
    );
  }

  _loadMap(position) {
    const { latitude } = position.coords; //we are taking  the latitude object
    const { longitude } = position.coords; //we are taking  the longitude object
    console.log(position);

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //Handling click on map
    this.#map.on('click', this._showForm.bind(this));

    ////////
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(e) {
    this.#mapE = e;

    //Adding a running form:
    form.classList.remove('hidden');

    //For a good UX (user experience) we can focus on the input:
    inputDistance.focus();
  }

  _hideForm() {
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        '';

    form.style.display = 'none';

    form.classList.add('hidden');

    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    //Prevent default behaviour:
    e.preventDefault();

    //Get data (values) from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapE.latlng;
    let workout;

    //Helper functions:
    const isValid = (...inputs) => inputs.every(inp => Number.isFinite(inp));
    const isPositive = (...inputs) => inputs.every(inp => inp > 0);

    //If workout is running create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;

      //Check if data is valid using guard:
      if (
        // !Number.isFinite(cadence) ||
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration)
        !isValid(cadence, distance, duration) ||
        !isPositive(cadence, distance, duration)
      )
        return alert('Введенное число должно быть положительным родной!');
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    //If workout is cycling create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      //Check if data is valid using guard:
      if (
        !isValid(elevation, distance, duration) ||
        !isPositive(distance, duration)
      )
        return alert('Введенное число должно быть положительным родной!');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    //Add new object to workout array
    this.#workouts.push(workout);

    //Render workout on map as a marker
    this._renderWorkoutMarker(workout);

    //Render workout on list
    this._renderWorkout(workout);
    //Clear inputs:
    this._hideForm();

    //Set locale storage to all workouts
    this._setLocaleStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`, //to costumize popup
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${
          workout.type === 'running'
            ? 'Побегай родный от души'
            : 'Покрути педали родный!'
        }`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `    
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <h2 class="workout__title">${workout.description}</h2>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>`;

    if (workout.type === 'running')
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
    </div>
  </li>`;

    if (workout.type === 'cycling')
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationgain}</span>
        <span class="workout__unit">m</span>
    </div>
  </li>
  `;
    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    //guard
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // workout.clicks();
  }

  _setLocaleStorage() {
    localStorage.setItem('workout', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workout'));

    //Guard
    if (!data) return;

    //Restoring workout array
    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }
  reset() {
    localStorage.removeItem('workout');
    location.reload();
  }
}

const app = new App();

/////////////////// MODIFY THIS APP!!!!
