# SOLARIS — Solar System Observatory

Simulasi tata surya 3D interaktif berbasis browser, dengan delapan planet, kontrol waktu, posisi heliosentris yang dihitung dari elemen orbit JPL, dan panel ensiklopedia untuk karakteristik fisik, orbit, rotasi, atmosfer, struktur internal, satelit alami, evolusi, dan misi eksplorasi.

## Fitur

- **Simulasi 3D** dengan kamera yang dapat diputar, digeser, dan diperbesar/diperkecil.
- **Posisi orbit berbasis waktu**: tanggal sistem saat ini digunakan sebagai waktu awal; posisi planet dihitung ulang menggunakan elemen Keplerian JPL.
- **Kontrol waktu**: live, play/pause, pemilihan tanggal, dan percepatan waktu hingga satu tahun simulasi per detik.
- **Pemilihan planet** dengan fokus kamera dan panel data terperinci.
- **Data fisik dan orbit**: diameter, massa, kerapatan, gravitasi, kecepatan lepas, suhu rata-rata, sumbu semi-mayor, perihelion, aphelion, eksentrisitas, inklinasi, kemiringan sumbu, periode rotasi, panjang hari, dan periode orbit.
- **Konteks ilmiah**: atmosfer, struktur internal, medan magnet, cincin, evolusi, bulan-bulan utama, dan misi eksplorasi.
- **Tanpa backend, API key, atau build step**. Three.js dimuat dari jsDelivr CDN.
- Layout responsif untuk desktop, tablet, dan ponsel.

## Menjalankan secara lokal

Karena aplikasi menggunakan JavaScript modules, buka melalui web server lokal (bukan `file://`). Cara mudah:

```bash
python -m http.server 8000
```

Lalu buka `http://localhost:8000`.

## Deploy ke GitHub Pages

1. Buat repository GitHub baru, misalnya `solaris-solar-system`.
2. Upload semua isi folder proyek ini ke root repository.
3. Buka **Settings → Pages**.
4. Pada **Build and deployment**, pilih **Deploy from a branch**.
5. Pilih branch `main` dan folder `/ (root)`, lalu klik **Save**.
6. Tunggu sampai GitHub Pages menerbitkan situs. URL biasanya berbentuk `https://USERNAME.github.io/REPOSITORY/`.

Tidak perlu mengubah base path karena seluruh file menggunakan path relatif.

## Metode posisi planet

Posisi planet dihitung di browser dari elemen orbit Keplerian (sumbu semi-mayor, eksentrisitas, inklinasi, bujur rata-rata, bujur perihelion, dan bujur node naik) serta laju perubahannya. Persamaan Kepler diselesaikan secara iteratif, lalu koordinat perifokal diputar ke bidang ekliptika J2000.

Parameter orbit mengacu pada **JPL Solar System Dynamics — Approximate Positions of the Planets**. JPL menyebutkan bahwa pendekatan ini cocok untuk rentang **1800–2050** dan memiliki kesalahan nominal yang berbeda untuk setiap planet. Untuk kebutuhan astrometri presisi tinggi, navigasi wahana, atau pengamatan profesional, gunakan ephemeris numerik JPL Horizons.

**Penting tentang skala 3D:** jarak orbit menggunakan satu skala linear AU yang sama, tetapi radius bola planet diperbesar agar terlihat. Karena itu, ukuran fisik planet tidak ditampilkan pada skala yang sama dengan jarak orbit. Panel data menampilkan angka fisik referensi.

**Penting tentang waktu nyata:** jam LIVE mengikuti jam perangkat dan posisi orbit dihitung ulang untuk waktu tersebut. Ini bukan feed telemetri langsung dari pesawat antariksa. Orientasi rotasi visual adalah representasi periodik, bukan penentuan meridian permukaan presisi. Bulan-bulan ditampilkan sebagai data ensiklopedia; posisi bulan tidak disimulasikan sebagai ephemeris presisi.

## Sumber data utama

- JPL Solar System Dynamics, [Approximate Positions of the Planets](https://ssd.jpl.nasa.gov/planets/approx_pos.html) — elemen orbit, metode Kepler, dan batas validitas.
- NASA Goddard NSSDCA, [Planetary Fact Sheet — Metric](https://nssdc.gsfc.nasa.gov/planetary/factsheet/) — data fisik ringkas.
- JPL Solar System Dynamics, [Planetary Physical Parameters](https://ssd.jpl.nasa.gov/planets/phys_par.html) — radius, massa, kerapatan, rotasi sideris, periode orbit, gravitasi, dan kecepatan lepas.
- NASA Science, [Solar System Facts](https://science.nasa.gov/solar-system/solar-system-facts/) — konteks sistem Tata Surya dan pembentukan.
- JPL Solar System Dynamics, [Solar System Dynamics](https://ssd.jpl.nasa.gov/) — katalog objek dan statistik satelit alami.
- Snapshot jumlah bulan per planet pada 19 Oktober 2026 merujuk daftar JPL SSD yang dirangkum di [SpaceOsmosis](https://spaceosmosis.com/solar-system/how-many-moons-does-each-planet-have/). Jumlah satelit alami dapat berubah setelah konfirmasi dan penamaan baru.

## Batasan dan catatan ilmiah

- Model orbital merupakan pendekatan Keplerian JPL, bukan integrasi gravitasi N-benda penuh.
- Earth menggunakan elemen Earth–Moon barycenter sebagai pendekatan orbit Bumi; selisih barycenter terhadap pusat Bumi sangat kecil dibanding satu AU.
- Angka suhu rata-rata merupakan nilai referensi ringkas dan tidak menggambarkan variasi suhu lokal atau profil atmosfer.
- Jumlah bulan adalah snapshot katalog, bukan query otomatis pada setiap kunjungan.
- Simulasi menampilkan delapan planet utama; planet katai dan benda kecil belum dimasukkan ke adegan 3D.

## Teknologi

- HTML, CSS, JavaScript ES Modules
- Three.js 0.180.0
- JPL Keplerian approximation

## Lisensi

Source code proyek ini dirilis di bawah MIT License. Rujukan ilmiah pihak ketiga tetap tunduk pada ketentuan sumber masing-masing.
