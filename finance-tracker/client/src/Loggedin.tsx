

import { useState, useEffect } from "react"
import { useLoaderData, useRevalidator } from "react-router-dom"
import { io } from "socket.io-client";
// import io
// maybe io.on 
// check wen something is added 
// emit when sum is added
// problem make expense update wen clicking add to list 




// mske it so when u leave the things are stiill there 
// find to do list array

//maybe save the to do list  array to to local storage
// set it when 
interface LoaderData {
  user: string;
  expense: number;
  isAdmin: boolean
}

interface Transaction {
  _id: string;
  user: string;
  description: string;
  amount: number;
  status: string;
}
interface LogEntry {
  _id: string;
  user: string;
  action: string;
  detail: string;
  date: string;
}
// find  somewhere where expense list is 
//  already reaceiving user  user of person to check if it has admin
export  function Loggedin() {
  const { user, expense,isAdmin} = useLoaderData() as LoaderData
  const [inputTake, changeInputTake] = useState<string>('')
  const [description, changeDescription] = useState<string>('')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [logEntries, setLogEntries] = useState<LogEntry[]>([])
  const revalidator = useRevalidator()
  const [view, setView] = useState<'expenses' | 'log'>('expenses')

  async function loadList() {
    const token = sessionStorage.getItem('token')
    const response = await fetch('https://real-time-multi-tenant-finance-platform.onrender.com/transactions', {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (response.ok) setTransactions(await response.json())
  }
  async function loadLog() {
    const token = sessionStorage.getItem('token')
    const response = await fetch('https://real-time-multi-tenant-finance-platform.onrender.com/auditlog', {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (response.ok) setLogEntries(await response.json())
  }

  useEffect(() => {
    const socket = io('https://real-time-multi-tenant-finance-platform.onrender.com', {
      auth: { token: sessionStorage.getItem('token') }
    })

    socket.on('expenseschanged', () => {
      loadList()
    })

    if (isAdmin) {
      socket.on('auditlog', (entry: LogEntry) => {
        setLogEntries(prev => [entry, ...prev])
      })
    }

    return () => {
      socket.disconnect()
    }
  }, [isAdmin])

  useEffect(()=>{
    loadList()
  },[])

  async function setStatus(id: string, status: 'approved' | 'rejected') {
    const token = sessionStorage.getItem('token')
    const response = await fetch(`https://real-time-multi-tenant-finance-platform.onrender.com/transactions/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    })
    if (response.ok) {
      loadList()
    } else {
      const err = await response.json()
      alert(err.wow || "Could not update expense.")
    }
  }

  return (
    <div>
      <p>{`hello ${user} Buisness`}</p>
      <p>Expense Total: ${expense || 0}</p>

      <input
        type="number"
        value={inputTake}
        onChange={(e) => changeInputTake(e.target.value)}
        placeholder="Enter expense amount"
      />

      <button onClick={async () => {
        const token = sessionStorage.getItem('token')

        const response = await fetch('https://real-time-multi-tenant-finance-platform.onrender.com/updateexpense', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ amount: Number(inputTake) })
        })

        if (response.ok) {
          alert("Expense updated successfully!")
          changeInputTake('')
          revalidator.revalidate()
        } else {
          alert("Failed to update expense.")
        }
      }}>
        Update Expense
      </button>

      <hr />

      <input
        value={description}
        onChange={(e) => changeDescription(e.target.value)}
        placeholder="What was it for?"
      />

      <button onClick={async () => {
        const token = sessionStorage.getItem('token')

        const response = await fetch('https://real-time-multi-tenant-finance-platform.onrender.com/transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ description, amount: Number(inputTake) })
        })

        if (response.ok) {
          changeDescription('')
          changeInputTake('')
          loadList()
        } else {
          const err = await response.json()
          alert(err.wow || "Failed to add expense.")
        }
      }}>
        Add To List
      </button>
      <div>
        <button onClick={() => setView('expenses')}>regular</button>
      </div>
      {isAdmin && <button onClick={() => { setView('log'); loadLog() }}>Audit log</button>}
      {view === 'expenses' ? (
        <ul>
          {transactions.map(t => (
            <li key={t._id}>
              {`${t.user}: ${t.description} - $${t.amount} (${t.status})`}
              {isAdmin ? (
                t.status === 'pending' && t.user !== user && (
                  <>
                    {' '}
                    <button onClick={() => setStatus(t._id, 'approved')}>Approve</button>
                    <button onClick={() => setStatus(t._id, 'rejected')}>Reject</button>
                  </>
                )
              ) : (
                t.status === 'pending' && <span> needs approval</span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <ul>
          {logEntries.map(e => (
            <li key={e._id}>
              {`${new Date(e.date).toLocaleString()} - ${e.user} ${e.action}: ${e.detail}`}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default Loggedin