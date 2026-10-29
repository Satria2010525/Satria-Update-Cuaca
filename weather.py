
import json
import os
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            parsed_url = urllib.parse.urlparse(self.path)
            params = urllib.parse.parse_qs(parsed_url.query)

            latitude = float(params.get("latitude", ["-6.9667"])[0])
            longitude = float(params.get("longitude", ["110.4167"])[0])

            if not (-90 <= latitude <= 90):
                raise ValueError("Latitude tidak valid.")

            if not (-180 <= longitude <= 180):
                raise ValueError("Longitude tidak valid.")

            query = urllib.parse.urlencode({
                "latitude": latitude,
                "longitude": longitude,
                "current": (
                    "temperature_2m,relative_humidity_2m,"
                    "apparent_temperature,precipitation,"
                    "precipitation_probability,weather_code,"
                    "wind_speed_10m"
                ),
                "hourly": "temperature_2m,weather_code",
                "daily": (
                    "weather_code,temperature_2m_max,"
                    "temperature_2m_min"
                ),
                "forecast_days": 7,
                "timezone": "auto"
            })

            url = "https://api.open-meteo.com/v1/forecast?" + query

            request = urllib.request.Request(
                url,
                headers={"User-Agent": "CuacaTerkini/1.0"}
            )

            with urllib.request.urlopen(request, timeout=15) as response:
                weather_data = json.loads(response.read().decode("utf-8"))

            body = json.dumps(weather_data).encode("utf-8")

            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "public, max-age=300")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(body)

        except (ValueError, KeyError) as error:
            self.send_error(400, str(error))

        except Exception:
            self.send_error(502, "Tidak dapat mengambil data cuaca.")

    def log_message(self, format, *args):
        # Mengurangi log request yang tidak diperlukan.
        return
