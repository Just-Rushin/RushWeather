// No API key here — it lives server-side in the Cloudflare Pages Function.
// All requests go through our own /api/weather proxy instead of OpenWeather directly.


$(document).ready(function () {
    // Default load
    getCoordinatesAndWeather('London');

    // Click event for the Search button in the navbar
    $('#searchBtn').on('click', function () {
        handleSearch();
    });

    // Support "Enter" keypress in the input box
    $('#cityInput').on('keypress', function (e) {
        if (e.which === 13) {
            handleSearch();
        }
    });
});

function handleSearch() {
    let cityName = $('#cityInput').val().trim();
    if (cityName) {
        getCoordinatesAndWeather(cityName);
    } else {
        alert('Please enter a city name.');
    }
}

// Step 1: Geocoding API - Convert City Name to Lat/Lon (via our proxy)
async function getCoordinatesAndWeather(cityName) {
    const geoEndpoint = `/api/weather?type=geo&q=${encodeURIComponent(cityName)}&limit=1`;

    try {
        const geoRes = await fetch(geoEndpoint);
        const geoData = await geoRes.json();

        if (geoRes.ok && geoData.length > 0) {
            const { lat, lon, name, country } = geoData[0];
            const displayName = country ? `${name}, ${country}` : name;
            
            // Step 2: Fetch Weather Data using coordinates
            fetchWeatherData(lat, lon, displayName);
        } else {
            alert('City not found. Please try entering a valid city name.');
        }
    } catch (error) {
        console.error('Error fetching geocoding data:', error);
        alert('Failed to locate city coordinates.');
    }
}

// Step 2: Fetch current weather + 3-hourly forecast (via our proxy, two calls)
async function fetchWeatherData(lat, lon, displayName) {
    const currentEndpoint = `/api/weather?type=current&lat=${lat}&lon=${lon}&units=metric`;
    const forecastEndpoint = `/api/weather?type=forecast&lat=${lat}&lon=${lon}&units=metric`;

    try {
        const [currentRes, forecastRes] = await Promise.all([
            fetch(currentEndpoint),
            fetch(forecastEndpoint)
        ]);
        const currentData = await currentRes.json();
        const forecastData = await forecastRes.json();

        if (currentRes.ok && forecastRes.ok) {
            displayWeatherData(displayName, currentData, forecastData);
        } else {
            const errMsg = currentData.message || forecastData.message || 'Unable to retrieve data.';
            alert(`Error fetching weather: ${errMsg}`);
        }
    } catch (error) {
        console.error('Error fetching weather data:', error);
        alert('Failed to retrieve weather data.');
    }
}

// Step 3: Render data to HTML
function displayWeatherData(cityName, currentData, forecastData) {
    // Display City Name
    $('#cityName').text(cityName);

    // Current Weather Parameters
    if (currentData) {
        const tempC = Math.round(currentData.main.temp);
        const description = currentData.weather[0].description;
        const humidity = currentData.main.humidity;
        // Convert wind speed from m/s to mph (1 m/s = ~2.23694 mph)
        const windMph = Math.round(currentData.wind.speed * 2.23694);

        $('#temperature').text(`Temperature: ${tempC}°C`);
        $('#description').text(`Description: ${description.charAt(0).toUpperCase() + description.slice(1)}`);
        $('#humidity').text(`Humidity: ${humidity}%`);
        $('#windSpeed').text(`Wind Speed: ${windMph} mph`);
    }

    // Render Forecast (next 12 entries = next 36 hours at 3-hour steps;
    // the free plan doesn't offer true hourly data)
    if (forecastData.list && forecastData.list.length > 0) {
        renderHourlyForecast(forecastData.list.slice(0, 12));
    }
}

// Function to render forecast cards
function renderHourlyForecast(hourlyData) {
    // Check if an hourly container already exists in DOM, otherwise create one dynamically
    let $hourlyContainer = $('#hourlyForecast');
    if ($hourlyContainer.length === 0) {
        $('.weather-info').append('<h3>Forecast</h3><div id="hourlyForecast" class="hourly-forecast-grid"></div>');
        $hourlyContainer = $('#hourlyForecast');
    }

    $hourlyContainer.empty();

    hourlyData.forEach(entry => {
        // Format time (e.g., 2 PM, 3 PM)
        const timeString = new Date(entry.dt * 1000).toLocaleTimeString([], { hour: 'numeric', hour12: true });
        const temp = Math.round(entry.main.temp);
        const desc = entry.weather[0].description;
        const humidity = entry.main.humidity;
        const windMph = Math.round(entry.wind.speed * 2.23694);

        const cardHtml = `
            <div class="hourly-card" style="border: 1px solid #05c425; margin: 5px; padding: 10px; border-radius: 6px; display: inline-block; min-width: 110px;">
                <strong>${timeString}</strong>
                <p style="margin: 5px 0;">${temp}°C</p>
                <p style="margin: 5px 0; font-size: 0.85em;">${desc}</p>
                <p style="margin: 5px 0; font-size: 0.8em;">💧 ${humidity}%</p>
                <p style="margin: 5px 0; font-size: 0.8em;">💨 ${windMph} mph</p>
            </div>
        `;
        $hourlyContainer.append(cardHtml);
    });
}
