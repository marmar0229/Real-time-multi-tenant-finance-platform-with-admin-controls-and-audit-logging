import type { FormEvent } from "react"
import { useNavigate } from "react-router-dom"

export function App() {
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const formdata = new FormData(e.currentTarget)
    const user = formdata.get("user")
    const pass = formdata.get("pass")
    const company = formdata.get("company")

    // Safely detect which button triggered the form submission
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
    const action = submitter?.getAttribute("data-action") // "/login" or "/createuser"

    if (!action) return

    try {
      const response = await fetch(`https://real-time-multi-tenant-finance-platform.onrender.com${action}`,  {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ user, pass, company })
      })

      if (!response.ok) {
        const errorText = await response.text()
        alert(`Error: ${errorText}`)
        return
      }

      if (action === "/createuser") {
        alert("Account created successfully! You can now log in.")
        return
      }

      if (action === "/login") {
        const token = await response.text()
        sessionStorage.setItem("token", token)

        const checkResponse = await fetch("https://real-time-multi-tenant-finance-platform.onrender.com/checktoken", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        if (checkResponse.ok) {
          navigate("/loggedinpage")
        } else {
          alert("Token validation failed.")
        }
      }
    } catch (err) {
      alert("Cannot connect to the backend server. Make sure it is running!")
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <p>Finance Tracker</p>

        <label>
          Username
          <input name="user" required />
        </label>
        <br />

        <label>
          Password
          <input name="pass" type="password" required />
        </label>
        <br />
        <label>
          Company
          <input name="company" required />
        </label>
        <br />

        <button data-action="/createuser" type="submit">
          Create Account
        </button>

        <button data-action="/login" type="submit">
          Login
        </button>
      </form>
    </div>
  )
}

export default App