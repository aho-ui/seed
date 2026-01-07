export const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString();
};

export const getConfidenceColor = (confidence) => {
  if (confidence >= 90) return '#4caf50';
  if (confidence >= 70) return '#ff9800';
  return '#ff6b6b';
};

export const getConfidenceClass = (confidence) => {
  const conf = confidence * 100;
  if (conf >= 90) return 'confidence-high';
  if (conf >= 70) return 'confidence-medium';
  return 'confidence-low';
};
