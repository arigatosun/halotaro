export const generateCancelUrl = (baseUrl: string, reservationId: string) => {
    return `${baseUrl}/cancel-reservation?id=${reservationId}`;
  };