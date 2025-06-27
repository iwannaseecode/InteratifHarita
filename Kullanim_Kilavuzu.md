KURULUM
1. API (Backend) Kurulumu //API varsayılan olarak http://localhost:5010 adresinde çalışır.
cd Farmlabs.MapApi
dotnet restore
dotnet run

2. Frontend (React) Kurulumu //Uygulama varsayılan olarak http://localhost:3000 adresinde açılır.
cd farmlabs-map
npm install
npm install shpjs
npm start

KULLANIM
Uygulamaları başlatın.
Tarayıcıda http://localhost:3000 adresine gidin.(Ama zaten sizi direk oraya atacaktır)
Harita üzerinde bir noktaya tıklayın.
Tıklanan noktada kırmızı bir işaret belirir.
Koordinat bilgisi ve API yanıtı ekranda gösterilir.

ÖZELLİKLER
--Harita Katmanı Seçimi:
Açılır menüden OpenStreetMap veya SentinelWms gibi farklı harita katmanlarını seçebilirsiniz.

--EPSG (Koordinat Sistemi) Seçimi:
Sayfanın üst kısmındaki açılır menüden EPSG:4326 (enlem/boylam) veya EPSG:3857 (Web Mercator/metre) seçebilirsiniz.
Seçiminize göre koordinatlar ve API’ye gönderilen değerler değişir.

--Koordinat Girme ve Gitme:
İlgili kutulara koordinat (veya EPSG:3857 seçiliyse X/Y metre) girip “Go” butonuna basarak haritayı o noktaya götürebilirsiniz.
Girilen noktada kırmızı bir işaret (dot) belirir.

--Haritada Tıklama:
Harita üzerinde bir noktaya tıklayarak o noktaya kırmızı işaret bırakabilirsiniz.
Tıklanan koordinat, seçili EPSG sistemine göre ekranda ve API’ye gönderilir.

--Dot’u Kaldırma:
“Remove Dot” butonuna basarak haritadaki kırmızı işareti kaldırabilirsiniz.

--API Entegrasyonu:
Tıklanan veya girilen koordinat, seçili EPSG ile birlikte .NET API’ye gönderilir.
API’den gelen yanıt ekranda gösterilir.

AYARLARI DEĞİŞTİRME(Farmlabs.MapApi dosyasının içinde appsettings.json)
--Başlangıç merkezi ve zoom seviyesi nereden ayarlanır?
appsettings.json dosyasındaki "MapDefaults" bölümünden.

--Harita katmanları nasıl değiştirilir?
appsettings.json dosyasındaki "MapLayers" bölümünden.

--EPSG nedir?
Koordinatların hangi sistemde gösterileceğini belirler.
EPSG:4326 → Enlem/Boylam (derece)
EPSG:3857 → Web haritaları için düzlemsel koordinat (metre)



