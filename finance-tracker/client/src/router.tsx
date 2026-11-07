import { createBrowserRouter, redirect } from "react-router-dom"
import { Loggedin } from "./Loggedin"
import { App } from "./App"

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    loader: () => {
      // If a token is already present, attempt to forward to the dashboard
      if (sessionStorage.getItem("token")) {
        return redirect("/loggedinpage")
      }
      return null
    }
  },
  {
    element: <Loggedin />,
    path: '/loggedinpage',
    loader: async () => {
      const token = sessionStorage.getItem("token")

      if (!token) {
        return redirect("/")
      }

      const response = await fetch('http://localhost:3000/receiveuserforpage', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      // Checks if the token is unauthorized (401) or invalid
      if (response.status === 401 || !response.ok) {
        sessionStorage.removeItem("token")
        return redirect("/")
      }

      return response.json()
    }
  }
])