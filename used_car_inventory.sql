-- phpMyAdmin SQL Dump
-- version 5.2.1deb3
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Aug 27, 2026 at 12:37 PM
-- Server version: 8.0.46-0ubuntu0.24.04.3
-- PHP Version: 8.3.6

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `ip_std6730202246`
--

-- --------------------------------------------------------

--
-- Table structure for table `used_car_inventory`
--

CREATE TABLE `used_car_inventory` (
  `car_id` int NOT NULL,
  `vin` varchar(17) COLLATE utf8mb4_unicode_ci NOT NULL,
  `license_plate` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `brand` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `model` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `model_year` int NOT NULL,
  `color` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mileage` int NOT NULL,
  `transmission` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fuel_type` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `purchase_price` decimal(12,2) NOT NULL,
  `selling_price` decimal(12,2) NOT NULL,
  `status` enum('Available','Reserved','Maintenance','Sold') COLLATE utf8mb4_unicode_ci DEFAULT 'Available',
  `purchase_date` date NOT NULL,
  `sold_date` date DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `image_emoji` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `used_car_inventory`
--

INSERT INTO `used_car_inventory` (`car_id`, `vin`, `license_plate`, `brand`, `model`, `model_year`, `color`, `mileage`, `transmission`, `fuel_type`, `purchase_price`, `selling_price`, `status`, `purchase_date`, `sold_date`, `notes`, `created_at`, `updated_at`, `image_url`, `image_emoji`) VALUES
(15157, 'ZFFZZ6HX8J9900006', 'กด-6545', 'Toyota', 'Camry', 2026, 'White', 2500, 'Auto', 'Hybrid', 1290000.00, 1390000.00, 'Available', '2026-07-27', NULL, 'Good condition', '2026-07-27 15:36:34', '2026-08-27 03:53:17', 'https://www.toyota.co.th/media/product/series/grades/v/camry/40/f1e6c8e17ef81419187d4535b3171c53918cd09292cb592c6e25343412124836.webp', '🚗'),
(15160, 'KMHHC4AE8FU600009', 'ดก-6541', 'Ford', 'Ranger', 2020, 'White', 98652, 'Manual', 'Diesel', 790000.00, 900000.00, 'Available', '2026-07-20', NULL, 'A bit of paint scratch', '2026-07-29 14:16:37', '2026-08-27 03:53:02', 'https://imgcdn.zigwheels.co.th/large/gallery/exterior/8/3061/ford-ranger-front-angle-low-view-716365.jpg', '🔋'),
(15162, '43651239568759465', 'สน-9658', 'Toyota', 'Land Cruiser FJ', 2026, 'White', 120, 'Auto', 'Gasoline', 1009000.00, 1120000.00, 'Sold', '2026-08-09', '2026-08-27', NULL, '2026-08-09 15:34:08', '2026-08-27 02:34:52', 'https://img-ik.cars.co.za/news-site-za/images/2025/10/2025-land-cruiser-fj-1.jpg?tr=f-auto,h-347,w-617,q-80', NULL),
(15163, '1C4RJFAG8KC000006', 'บม-34', 'Nissan', 'Skyline GT-R R34 BNR34', 1999, 'White', 4659, 'Manual', 'Gasoline', 8999000.00, 9999000.00, 'Available', '2026-08-12', NULL, 'A bit of paint scratch', '2026-08-12 13:56:36', '2026-08-27 03:53:30', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSNUbBhazbgbpAUeTnX_E2GcmfxbeWb4WJ_LiITpVEWF_602KOUd-1GLy9h&s=10', NULL),
(15164, 'VF30U5FXXHY800009', 'ขบ-6954', 'GWM', 'TANK 300', 2025, 'Orange', 46532, 'Auto', 'Diesel', 990000.00, 1190000.00, 'Available', '2026-08-26', NULL, 'Good condition', '2026-08-26 12:24:45', '2026-08-27 03:54:26', 'https://cf.autodeft2.pw/content/20230922/gwm-tank-300-preview-2023-2-RD94CJ.jpg', NULL),
(15169, 'VF30U5FXXHY800005', 'ชล-6952', 'Nissan', 'Almera', 2025, 'Grey', 65984, 'Auto', 'Diesel', 299000.00, 399000.00, 'Available', '2026-08-27', NULL, 'Good Condition', '2026-08-27 02:36:13', '2026-08-27 03:52:09', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRPWZ84hCYCqQzA0Tt_DYrC1n5489WlgD2YR8KH9Af75wxBQnREgxkVbf8&s=10', NULL),
(15172, '1HGCR2F33HA100002', '3กบ-6598', 'Honda', 'Civic RS', 2025, 'Silver', 5632, 'Auto', 'Hybrid', 999000.00, 1099000.00, 'Available', '2026-08-27', NULL, 'Very good condition', '2026-08-27 04:37:18', '2026-08-27 04:37:18', 'https://scontent.fbkk30-1.fna.fbcdn.net/v/t39.99422-6/751549638_869104929310572_9047184018479149589_n.png?stp=dst-jpg_tt6&cstp=mx2048x1365&ctp=s2048x1365&_nc_cat=110&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=127cfc&_nc_ohc=51Dn0GSNAzwQ7kNvwHZMo5q&_nc_oc=Adq-inYyqj5PBDMF6XpQ4fHtJk8Z7Q5jcZvB6gqejZ4vK5Eq_0BMC4JGyH_DD7DF0YQSpPtCyx7O6BtrjoH2vcJe&_nc_zt=14&_nc_ht=scontent.fbkk30-1.fna&_nc_gid=hHYl3d5CVL3S12YIHtLNsQ&_nc_ss=7b2a8&oh=00_AQEaztm-6_A6ijcgNk2f0FIbo7MIzCnr5cs7n8EqaaaGrw&oe=6A9587B2', NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `used_car_inventory`
--
ALTER TABLE `used_car_inventory`
  ADD PRIMARY KEY (`car_id`),
  ADD UNIQUE KEY `vin` (`vin`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `used_car_inventory`
--
ALTER TABLE `used_car_inventory`
  MODIFY `car_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15174;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
