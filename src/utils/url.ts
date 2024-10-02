export const generateCancelUrl = (baseUrl: string, reservationId: string) => {
    return `${baseUrl}/customer-cancel-reservation?id=${reservationId}`;
  };