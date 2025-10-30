import AnimatedSimpleLoading from "@/components/AnimatedIcons/AnimatedSimpleLoading.tsx";
import { useAdminAuth } from "@/context/AdminAuthProvider.tsx";
import { useDevicesWithLatestMetrics } from "@/hooks/useApi.ts";
import type { Alert, Device, Measurement } from "@/types/admin.ts";
import { useEffect, useState, type JSX } from "react";
import {
	FiCpu,
	FiEdit,
	FiEye,
	FiPlus,
	FiThermometer,
	FiTrash2,
	FiTrendingUp,
	FiX,
	FiDroplet,
	FiCloud,
	FiZap,
	FiBattery,
	FiLock,
	FiAlertTriangle,
	FiInfo,
	FiMove,
	FiCheckSquare,
} from "react-icons/fi";
import { HubConnectionBuilder } from "@microsoft/signalr";
import toast from "react-hot-toast";

// Map each metric type to a corresponding icon for UI display
const metricIcons: Record<string, JSX.Element> = {
	temperature: <FiThermometer className="w-4 h-4 text-red-500" />,
	humidity: <FiDroplet className="w-4 h-4 text-blue-500" />,
	co2: <FiTrendingUp className="w-4 h-4 text-green-500" />,
	voc: <FiCloud className="w-4 h-4 text-gray-500" />,
	motion: <FiMove className="w-4 h-4 text-purple-500" />,
	energy: <FiZap className="w-4 h-4 text-yellow-500" />,
	voltage: <FiBattery className="w-4 h-4 text-yellow-700" />,
	cpu_load: <FiCpu className="w-4 h-4 text-pink-500" />,
	gpu_load: <FiCpu className="w-4 h-4 text-pink-700" />,
	door_open: <FiLock className="w-4 h-4 text-gray-700" />,
	smoke_detected: <FiAlertTriangle className="w-4 h-4 text-red-700" />,
	status: <FiInfo className="w-4 h-4 text-gray-400" />,
};

const Devices = () => {
	// Require admin authentication to view this page
	useAdminAuth();

	// Local state
	const [showModal, setShowModal] = useState(false);
	const [alerts, setAlerts] = useState<Alert[]>([]);
	const [devices, setDevices] = useState<Device[]>([]);
	const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(
		null
	);
	console.log("alerts:", alerts);

	// Fetch devices with latest metrics using the custom hook
	const {
		data: devicesData,
		isLoading,
		error,
	} = useDevicesWithLatestMetrics();

	if (error) {
		throw error; // This will trigger ErrorBoundary fallback
	}

	// When API data is fetched store it in local devices state
	useEffect(() => {
		if (devicesData) setDevices(devicesData as Device[]);
	}, [devicesData]);

	// --- SignalR: realtime updates for device measurements and alerts ---
	useEffect(() => {
		const connection = new HubConnectionBuilder()
			.withUrl("http://localhost:5103/hub/telemetry") // SignalR hub endpoint
			.withAutomaticReconnect() // reconnect automatically if connection drops
			.build();

		// Listen to new measurements from SignalR
		// When a new measurement is received, update the corresponding device
		connection.on("measurementReceived", (data: Measurement) => {
			// Update the corresponding device metrics in state
			setDevices((prevDevices) =>
				prevDevices.map((d) =>
					d.id === data.deviceId
						? {
								...d,
								latest: {
									...d.latest,
									metrics: [
										...(d.latest?.metrics?.filter(
											(m) => m.type !== data.type
										) || []),
										{ ...data },
									].sort((a, b) =>
										a.type.localeCompare(b.type)
									),
								},
						  }
						: d
				)
			);
		});

		// Listen to alerts raised by Rules.Engine
		connection.on("alertRaised", (alert: Alert) => {
			console.log("Received alert:", alert);

			// Add alert to local state (keep newest on top)
			setAlerts((prev) => [alert, ...prev]);
			const dev = devices.find((d) => d.id === alert.deviceId);

			// Show toast notification with alert details
			toast(
				<div
					onClick={() => {
						if (dev) {
							setSelectedDeviceId(dev.id);
							setShowModal(true);
						}
					}}
					style={{ cursor: "pointer" }}
				>
					<p>
						<strong>{alert.type?.toUpperCase() || "Alert"}</strong>{" "}
						on
						{` device ${alert.deviceId}`}
						<br />
						{alert.message || `Value: ${alert.value}`}
					</p>
				</div>,
				{ duration: 5000, icon: "⚠️" }
			);
		});

		// Start connection and join tenant group
		connection
			.start()
			.then(() => {
				console.log("SignalR connected");
				return connection.invoke("JoinTenant", "innovia");
			})
			.then(() => console.log("Joined tenant group: innovia"))
			.catch((err) => console.error("SignalR error:", err));

		return () => {
			connection.stop();
		};
	}, []);

	// Compute the live selected device for modal rendering
	const liveSelectedDevice =
		devices.find((d) => d.id === selectedDeviceId) || null;

	// Open the modal to view device details
	const handleViewDevice = (device: Device) => {
		setSelectedDeviceId(device.id);
		setShowModal(true);
	};

	return (
		<div className="space-y-4 sm:space-y-6">
			{/* Header Section*/}
			<div>
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
					<div>
						<h1 className="text-2xl font-semibold text-gray-900">
							IoT Devices
						</h1>
						<p className="text-gray-600 mt-1">
							Monitor and manage registered IoT sensors connected
							to Innovia Hub
						</p>
					</div>
					<div className="flex items-center space-x-3">
						<button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
							<FiPlus className="w-4 h-4 mr-2" />
							Add Device
						</button>
					</div>
				</div>
			</div>

			{/* Devices Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{isLoading ? (
					//  Loading indicator
					<div className="flex justify-center items-center h-64">
						<AnimatedSimpleLoading />
					</div>
				) : !devices || devices.length === 0 ? (
					<div className="col-span-full p-12 text-center text-gray-500">
						<FiCpu className="w-12 h-12 mx-auto mb-4 text-gray-400" />
						<p>No devices found.</p>
					</div>
				) : (
					devices.map((device) => (
						<div
							key={device.id}
							className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
						>
							{/* Device Header */}
							<div className="flex items-center justify-between mb-3">
								<div className="flex items-center space-x-3">
									<div className="p-3 bg-blue-100 rounded-lg">
										{device.model
											?.toLowerCase()
											.includes("temp") ? (
											<FiThermometer className="w-5 h-5 text-blue-600" />
										) : device.model
												?.toLowerCase()
												.includes("co2") ? (
											<FiTrendingUp className="w-5 h-5 text-green-600" />
										) : (
											<FiCpu className="w-5 h-5 text-gray-600" />
										)}
									</div>
									<div>
										<h3 className="text-lg font-semibold text-gray-900">
											{device.model}
										</h3>
										<p className="text-sm text-gray-500">
											{device.serial}
										</p>
									</div>
								</div>
								<span
									className={`px-3 py-1 text-xs font-semibold rounded-full ${
										device.status === "active"
											? "bg-green-100 text-green-700"
											: "bg-gray-100 text-gray-700"
									}`}
								>
									{device.status === "active"
										? "Online"
										: "Offline"}
								</span>
							</div>

							{/* Latest Metrics */}

							<div className="space-y-2 mb-4 text-sm text-gray-700">
								{device.latest?.metrics?.map((m) => (
									<div
										key={m.type}
										className="flex justify-between items-center"
									>
										<span className="flex items-center space-x-1">
											{(metricIcons[
												m.type
											] as JSX.Element) || (
												<FiInfo className="w-4 h-4 text-gray-400" />
											)}
											<span>
												{m.type.replace("_", " ")}
											</span>
										</span>
										<span>
											{m.unit === "bool" ? (
												m.value ? (
													<FiCheckSquare className="w-5 h-5 text-green-600" />
												) : (
													<FiX className="w-5 h-5 text-red-600" />
												)
											) : typeof m.value === "number" ? (
												`${m.value.toFixed(1)} ${
													m.unit
												}`
											) : (
												`${m.value} ${m.unit}`
											)}
										</span>
									</div>
								))}
							</div>

							{/* Actions */}
							<div className="flex space-x-2">
								<button
									onClick={() => handleViewDevice(device)}
									className="flex-1 flex items-center justify-center px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-700 hover:text-white transition-colors cursor-pointer"
								>
									<FiEye className="w-4 h-4 mr-2" />
									View
								</button>
								<button className="flex items-center justify-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
									<FiEdit className="w-4 h-4 mr-2" />
									Edit
								</button>
								<button className="flex items-center justify-center px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors cursor-pointer">
									<FiTrash2 className="w-4 h-4" />
								</button>
							</div>
						</div>
					))
				)}
			</div>

			{/* View Device Modal */}
			{showModal && liveSelectedDevice && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-lg font-semibold text-gray-900">
								Device Details
							</h3>
							<button
								onClick={() => setShowModal(false)}
								className="text-gray-400 hover:text-gray-600"
							>
								<FiX className="w-6 h-6" />
							</button>
						</div>
						<div className="space-y-3 text-sm text-gray-700">
							<p>
								<strong>Name:</strong>{" "}
								{liveSelectedDevice.model}
							</p>
							<p>
								<strong>Room:</strong>{" "}
								{liveSelectedDevice.roomId || "--"}
							</p>
							<p>
								<strong>Status:</strong>{" "}
								<span
									className={`px-2 py-1 rounded-full text-xs font-semibold ${
										liveSelectedDevice.status === "active"
											? "bg-green-100 text-green-700"
											: "bg-gray-100 text-gray-700"
									}`}
								>
									{liveSelectedDevice.status === "active"
										? "Online"
										: "Offline"}
								</span>
							</p>

							{/* Latest Metrics */}
							<div className="space-y-1 mt-2">
								{liveSelectedDevice.latest?.metrics?.map(
									(m) => (
										<div
											key={m.type}
											className="flex justify-between"
										>
											<span>
												{m.type
													.replace("_", " ")
													.charAt(0)
													.toUpperCase() +
													m.type
														.replace("_", " ")
														.slice(1)}
											</span>
											<span>
												{m.unit === "bool" ? (
													m.value ? (
														<FiCheckSquare className="w-5 h-5 text-green-600" />
													) : (
														<FiX className="w-5 h-5 text-red-600" />
													)
												) : typeof m.value ===
												  "number" ? (
													`${m.value.toFixed(1)} ${
														m.unit
													}`
												) : (
													`${m.value} ${m.unit}`
												)}
											</span>
										</div>
									)
								)}
							</div>
						</div>

						<div className="flex space-x-3 pt-6">
							<button
								onClick={() => setShowModal(false)}
								className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-700 hover:text-white transition-colors cursor-pointer "
							>
								Close
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default Devices;
