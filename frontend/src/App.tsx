import { Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import BookingPage from "./pages/BookingPage";
import AdminLayout from "./components/Admin/Layout/AdminLayout";
import Dashboard from "./pages/Admin/Dashboard";
import Users from "./pages/Admin/Users";
import Bookings from "./pages/Admin/Bookings";
import Resources from "./pages/Admin/Resources";
import Devices from "./pages/Admin/Devices.tsx";
import AdminProtectedRoute from "./components/Admin/AdminProtectedRoute";
import AdminWrapper from "./components/Admin/AdminWrapper";
import "./App.css";
import MyBookings from "./pages/MyBookings";
import Navbar from "./components/navbar";
import Footer from "./components/footer";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import ScrollToTop from "./components/ScrollToTop.tsx";
import ErrorBoundary from "./components/ErrorBoundary/errorBoundary.tsx";

function App() {
	return (
		<div className="App min-h-screen flex flex-col">
			<ScrollToTop />
			<Navbar />
			<Routes>
				{/* Main Website Routes */}
				<Route path="/" element={<LandingPage />} />
				<Route path="/login" element={<Login />} />
				<Route path="/signup" element={<Signup />} />
				<Route
					path="/bookings"
					element={
						<ProtectedRoute>
							<BookingPage />{" "}
						</ProtectedRoute>
					}
				/>
				<Route
					path="/myBookings"
					element={
						<ProtectedRoute>
							{" "}
							<MyBookings />{" "}
						</ProtectedRoute>
					}
				/>

				{/* Admin Routes with AdminAuthProvider */}
				<Route
					path="/admin/*"
					element={
						<AdminWrapper>
							<Routes>
								<Route
									path=""
									element={
										<AdminProtectedRoute>
											<AdminLayout />
										</AdminProtectedRoute>
									}
								>
									<Route
										index
										element={
											<Navigate
												to="/admin/dashboard"
												replace
											/>
										}
									/>
									<Route
										path="dashboard"
										element={<Dashboard />}
									/>
									<Route path="users" element={<Users />} />
									<Route
										path="bookings"
										element={<Bookings />}
									/>
									<Route
										path="resources"
										element={<Resources />}
									/>
									<Route
										path="devices"
										element={
											<ErrorBoundary
												fallback={
													<div className="p-12 text-center text-gray-700">
														<div className="text-6xl mb-4">
															⚠️
														</div>
														<p className="text-lg font-semibold">
															Devices are offline.
															Please try again
															later.
														</p>
													</div>
												}
											>
												<Devices />
											</ErrorBoundary>
										}
									/>
									<Route
										path="*"
										element={
											<Navigate
												to="/admin/dashboard"
												replace
											/>
										}
									/>
								</Route>
							</Routes>
						</AdminWrapper>
					}
				/>

				{/* Default redirect to home page */}
				<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>
			<Footer />
		</div>
	);
}

export default App;
