# 💡 Innovia Hub

## 🏢 General Information

Innovia Hub is a coworking space booking system that allows members to reserve resources like desks, meeting rooms, VR headsets, and an AI server in real-time. The system features an AI-powered Smart Booking Assistant that analyzes booking patterns and provides intelligent recommendations to help users find the best available resources at optimal times.

<br/>

## 🛠️ Built with

-   ⚛️ [React.js](https://reactjs.org/) --> frontend
-   🌀 [Tailwind](https://tailwindcss.com/) --> styling
-   🧱 [ASP.NET Core Web API](https://learn.microsoft.com/en-us/aspnet/core/web-api/?view=aspnetcore-9.0) --> backend
-   🗄️ MySQL --> database
-   🔐 JWT --> authentication
-   🔁 [SignalR](https://learn.microsoft.com/en-us/aspnet/core/signalr/introduction?view=aspnetcore-9.0) --> real-time updates
-   🤖 [OpenAI API](https://platform.openai.com/docs/overview) --> AI Recommendations

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

## 🔑 Using the Application

**For Members**

1.  Sign in with your account or create a new one
2.  Browse available resources on the `Booking` page
3.  Get AI recommendations for optimal booking times and resources
4.  Make a booking by selecting a resource, date and time
5.  View your bookings in your dashboard, `MyBookings` page
6.  Real-time updates keep you informed when resource availability changes

**For Administrators**

1.  Sign in with the admin account
2.  Access admin tools at `/admin`
3.  Manage resources (add, edit or remove)
4.  View all bookings and user activity
5.  Monitor resource utilization patterns
6.  The system prevents double-bookings automatically

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
