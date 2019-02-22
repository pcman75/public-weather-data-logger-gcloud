function log2Influx(weather) {
  const Influx = require('influx');
  const influx = new Influx.InfluxDB({
    host: `${process.env.INFLUX_HOST}`,
    username: `${process.env.INFLUX_USER}`,
    password: `${process.env.INFLUX_PASS}`,
    database: `${process.env.INFLUX_DB}`,
    schema: [
      {
        measurement: `${process.env.INFLUX_MEASUREMENT}`,
        fields: {
          temperature: Influx.FieldType.FLOAT,
          pressure: Influx.FieldType.FLOAT,
          humidity: Influx.FieldType.FLOAT,
        },
        tags: [
          'location', 'service'
        ]
      }
    ]
  });
  influx.writePoints([
    {
      measurement: 'publicdata',
      tags: { location: weather.location, service: weather.service },
      fields: { temperature: weather.temperature, pressure: weather.pressure, humidity: weather.humidity },
      timestamp: weather.timestamp
    }
  ],
    {
      precision: 's'
    }).catch((error) => {
      console.error("InfluxDb", error);
    })
}

/**
 * Responds to any HTTP request.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */
exports.logOpenWeather = (req, res) => {
  let urlOpenWeatherMap = `http://api.openweathermap.org/data/2.5/weather?id=${process.env.OWM_LOC_ID}&appid=${process.env.OWM_API_KEY}&units=metric`;
  let urlDarkSky = `https://api.darksky.net/forecast/${process.env.DSKY_API_KEY}/${process.env.DSKY_LOC}?units=si&exclude=daily,flags,hourly`;

  let request = require('request-promise-native').defaults({ json: true, timeout: 2000});
  
  request(urlOpenWeatherMap).then( (body) => {
      let weather = { timestamp: body.dt, service: 'OpenWeatherMap', location: body.name, temperature: body.main.temp, pressure: body.main.pressure, humidity: body.main.humidity }
      log2Influx(weather);
      return {openmanpWeather: weather}
    }).then((publicweather, err) => {
      request(urlDarkSky).then( (body) => {
          let weather = { timestamp: body.currently.time, service: 'DarkSky', location: `${body.latitude},${body.longitude}`, 
          temperature: body.currently.temperature, pressure: body.currently.pressure, humidity: body.currently.humidity * 100}
          log2Influx(weather);
          res.status(200).send(publicweather);
      }).catch( (err) => {
        console.error(err);
        res.status(200).send(publicweather);
      });
    }).catch( (err) => {
      console.error(err);
      res.status(200).send(err);
    });
};

//todo debug: 
//functions deploy logOpenWeather --trigger-http