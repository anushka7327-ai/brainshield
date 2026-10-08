const calculateRisk = (similarity) => {
  if (similarity >= 80) {
    return "High";
  }

  if (similarity >= 50) {
    return "Medium";
  }

  return "Low";
};

const calculateSimilarity = (brandName, suspiciousName, keywords = []) => {
  if (!brandName || !suspiciousName) {
    return 0;
  }

  const brand = brandName.toLowerCase();
  const suspicious = suspiciousName.toLowerCase();

  let score = 0;

  if (suspicious.includes(brand)) {
    score += 70;
  }

  keywords.forEach((keyword) => {
    if (suspicious.includes(keyword.toLowerCase())) {
      score += 10;
    }
  });

  return Math.min(score, 100);
};

module.exports = {
  calculateRisk,
  calculateSimilarity,
};