# 💡 Innovia Hub

## 🏢 General Information

Innovia Hub is a coworking space booking system that allows members to reserve resources like desks, meeting rooms, VR headsets and an AI server in real-time. The system features an AI-powered Smart Booking Assistant that analyzes booking patterns and provides intelligent recommendations to help users find the best available resources at optimal times.

It also features IoT functionality through a Devices page, where administrators can view and manage connected smart devices within the coworking environment.

The solution demonstrates how AI, IoT and real-time communication can be combined into a cohesive and user-friendly resource management platform.

<br/>

## 🛠️ Built with

-   ⚛️ [React.js](https://reactjs.org/) --> frontend
-   🌀 [Tailwind](https://tailwindcss.com/) --> styling
-   🧱 [ASP.NET Core Web API](https://learn.microsoft.com/en-us/aspnet/core/web-api/?view=aspnetcore-9.0) --> backend
-   🗄️ MySQL --> database
-   🔐 JWT --> authentication
-   🔁 [SignalR](https://learn.microsoft.com/en-us/aspnet/core/signalr/introduction?view=aspnetcore-9.0) --> real-time updates
-   🤖 [OpenAI API](https://platform.openai.com/docs/overview) --> AI Recommendations
-   🌐 IoT Integration --> devices page for connected smart devices

<br/>

## 🌟 Features I Personally Developed

1. 🤖 AI Smart Booking Assistant

    - Integrated with the OpenAI API to analyze user booking patterns
    - Suggests optimal booking times and available resources
    - Built into the backend and connected to the React frontend

2. 📡 IoT Functionality (Devices Page)

    - Displays connected IoT devices such as smart sensors
    - Real-time device status updates using SignalR
    - Enables admins to view and monitor active or inactive devices

3. 🔔 Enhanced Real-time System Updates
    - Improved SignalR implementation to ensure instant synchronization across clients when a resource is booked, released or updated.

<br/>

## 🌐 Architecture Overview

-   **Frontend** runs on: [http://localhost:5173](http://localhost:5173)
-   **Backend** runs on: [https://localhost:7161](https://localhost:7161)
-   **Database** runs on port **3306**:
    -   Host: `127.0.0.1`
    -   Port: `3306`
    -   Database name: `innovia_hub`
    -   User: (your MySQL username)
    -   Password: (your MySQL password)
-   The frontend communicates with the backend through RESTful API endpoints
-   JWT tokens are used for secure user authentication
-   SignalR provides real-time booking updates across all connected clients
-   OpenAI API integration powers the Smart Booking Assistant

<br/>

## 🚀 Getting Started

### 🔧 Prerequisites

Before you begin, make sure you have the following installed:

-   .NET 8 or 9 SDK
-   Node.js & npm
-   MySQL Server (running on `localhost:3306`)
-   OpenAI API Key (get one from [OpenAI Platform](https://platform.openai.com/docs/overview))

### 🐘 Database Setup (MySQL)

1. Start your MySQL server.
2. Create the database and user.
3. Confirm the connection string in `backend/appsettings.json`.

    ```
    "ConnectionStrings": {
    "DefaultConnection": "server=127.0.0.1;port=3306;database=innovia_hub;user=YourName;password=YourPassword"
    },
    "Jwt": {
    "SecretKey": ReplaceWithASecretKeyAtLeast32Chars!,
    "Issuer": "InnoviaHub",
    "Audience": "InnoviaHubUsers",
    "ExpirationMinutes": 60
    }
    ```

### 🔑 Environment Variables

Create a file named `.env` in the `backend/` directory and add:

```
OPENAI_API_KEY=REPLACE_WITH_YOUR_OPENAI_KEY
```

⚠️ The `.env` file is required for OpenAI integration and should never be committed to Git.
Make sure `.env` is included in `.gitignore`.

### 📦 Clone the Repository

```
git clone git@github.com:HeidiDragomir/innovia-hub-AI.git
cd innovia-hub-AI
```

### 🖥️ Running the Application

#### ⚙️ Backend

```
cd backend
dotnet restore
dotnet ef database update
dotnet run
```

-   The backend will start on https://localhost:7161
-   The first startup will automatically seed:
    -   Roles: Admin, Member
    -   Users:
        -   Admin: admin@innoviahub.com / Admin123!
        -   Member: member@innoviahub.com / Member123!
    -   Resource Types and Resources (Desks, Meeting Rooms, VR Sets, AI Server)

### 🎨 Frontend

```
cd frontend
npm install
npm run dev
```

The application will be available at http://localhost:5173

<br/>

## 🧪 Testing the Application

You can log in using the pre-seeded test accounts:

| Role   | Email                 | Password   |
| ------ | --------------------- | ---------- |
| Admin  | admin@innoviahub.com  | Admin123!  |
| Member | member@innoviahub.com | Member123! |

### Test Scenarios

**For Members:**

1.  Log in as a Member.
2.  Browse available desks, meeting rooms or devices.
3.  Use the AI Smart Booking Assistant to get booking recommendations.
4.  Create and cancel bookings.
5.  Observe real-time updates when availability changes.

**For Admins:**

1.  Log in as an Admin.
2.  Navigate to `/admin`.
3.  Manage users, resources and IoT devices.
4.  View all bookings and real-time activity updates.

<br/>

## ☁️ Deployment

The application is fully deployed using Azure and Netlify for a scalable and cloud-based setup.

### Frontend Deployment --> [Netlify](https://www.netlify.com/)

-   The React.js frontend is hosted on [Netlify](https://www.netlify.com/).

-   Continuous Deployment (CD) is configured directly from the GitHub repository.

-   Every push to the main branch triggers an automatic redeploy.

-   Environment variables are configured in the Netlify dashboard for API communication.

### Backend & Database - [Azure](https://azure.microsoft.com/en-us/free/students)

-   The ASP.NET Core Web API is hosted using `Azure App Service`.

-   The database runs on `Azure Database for MySQL Flexible Server`.

-   SignalR is hosted on `Azure SignalR Service` for scalable real-time communication.

-   Azure handles SSL certificates and secure connections between services.

-   OpenAI API keys are securely managed using Azure Application Settings.

<br/>

## 📊 Database Seeding

On application startup, the backend automatically seeds:

-   Roles and Users using `DbSeeder.SeedRolesAndUsersAsync()`
    -   Adds Admin and Member roles if missing.
    -   Creates `admin@innoviahub.com` and `member@innoviahub.com` test users.
-   Resource Types & Resources via `OnModelCreating()` in `ApplicationDbContext`:
    -   15 Desks (Desk 1–Desk 15)
    -   4 Meeting Rooms
    -   4 VR Headsets
    -   1 AI Server

<br/>

## 📬 API Documentation

🔗 [Postman Documentation](https://documenter.getpostman.com/view/22983418/2sB3QKsAEs)

<br/>

## 🔧 Troubleshooting

**Database connection issues:**

-   Verify MySQL is running on port `3306`
-   Check username and password in `appsettings.json`
-   Ensure the MySQL user has proper permissions

**Migration errors:**

-   Delete existing database and migrations, then run `dotnet ef database update `again

**Frontend not connecting to backend:**

-   Verify backend is running on `https://localhost:7161`
-   Clear browser cache and restart the frontend

**AI recommendations not working:**

-   Verify your OpenAI API key in the `.env` file
-   Check that the `.env` file is in the backend folder
-   Ensure you have available credits on your OpenAI account

<br/>

## 👩‍💻 Contact

Email: [@HeidiDragomir](https://github.com/HeidiDragomir)

LinkedIn: [Marinela-Adelheid Dragomir](https://www.linkedin.com/in/heidi-dragomir/)

<br/>

## 📄 License

Distributed under the MIT License. See [LICENSE](https://choosealicense.com/licenses/mit/) for more information.
