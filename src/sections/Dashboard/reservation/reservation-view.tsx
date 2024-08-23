"use client";
import React, { useState, useEffect } from 'react';
import ReservationCalendar from '@/components/ReservationCalendar';
import ReservationModal from '@/components/ReservationModal';
import { Reservation, getReservations, addReservation, updateReservation, deleteReservation } from '@/app/actions/reservationActions';

const ReservationView: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  useEffect(() => {
    const fetchReservations = async () => {
      const data = await getReservations(selectedDate);
      setReservations(data);
    };
    fetchReservations();
  }, [selectedDate]);

  const handleReservationSelect = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setIsModalOpen(true);
  };

  const handleReservationCreate = (data: Partial<Reservation>) => {
    setSelectedReservation(null);
    setIsModalOpen(true);
  };

  const handleReservationUpdate = async (data: Reservation) => {
    try {
      await updateReservation(data.id, data);
      setIsModalOpen(false);
      setSelectedReservation(null);
      // 予約を再取得
      const updatedReservations = await getReservations(selectedDate);
      setReservations(updatedReservations);
    } catch (error) {
      console.error('Failed to update reservation:', error);
    }
  };

  const handleReservationDelete = async (id: string) => {
    try {
      await deleteReservation(id);
      setIsModalOpen(false);
      setSelectedReservation(null);
      // 予約を再取得
      const updatedReservations = await getReservations(selectedDate);
      setReservations(updatedReservations);
    } catch (error) {
      console.error('Failed to delete reservation:', error);
    }
  };

  const handleModalSubmit = async (data: Partial<Reservation>) => {
    if (selectedReservation) {
      await handleReservationUpdate({ ...selectedReservation, ...data } as Reservation);
    } else {
      try {
        await addReservation(data as Omit<Reservation, 'id'>);
        setIsModalOpen(false);
        // 予約を再取得
        const updatedReservations = await getReservations(selectedDate);
        setReservations(updatedReservations);
      } catch (error) {
        console.error('Failed to add reservation:', error);
      }
    }
  };

  return (
    <div className="p-8 pt-0">
      <h2 className="text-3xl font-bold mb-8">予約管理</h2>
      <ReservationCalendar
        reservations={reservations}
        onReservationSelect={handleReservationSelect}
        onReservationUpdate={handleReservationUpdate}
        onReservationCreate={handleReservationCreate}
      />
      <ReservationModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedReservation(null);
        }}
        onSubmit={handleModalSubmit}
        onDelete={selectedReservation ? () => handleReservationDelete(selectedReservation.id) : undefined}
        initialValues={selectedReservation || undefined}
        title={selectedReservation ? "予約編集" : "新規予約"}
      />
    </div>
  );
};

export default ReservationView;