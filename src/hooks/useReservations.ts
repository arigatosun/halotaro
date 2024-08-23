// src/hooks/useReservations.ts
import { useState, useEffect } from 'react'
import { Reservation, getReservations } from '@/app/actions/reservationActions'

export const useReservations = (date: string, staff?: string) => {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchReservations = async () => {
      try {
        setLoading(true)
        const data = await getReservations(date, staff)
        setReservations(data)
      } catch (error) {
        setError(error as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchReservations()
  }, [date, staff])

  return { reservations, loading, error }
}