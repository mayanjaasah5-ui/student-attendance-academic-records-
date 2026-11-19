// Inclusive lower bounds. Update this scale to match your institution's policy.
const gradingScale = [
  { minimum: 80, grade: 'A' },
  { minimum: 70, grade: 'B' },
  { minimum: 60, grade: 'C' },
  { minimum: 50, grade: 'D' },
  { minimum: 0, grade: 'F' }
];

function gradeFor(total) {
  const band = gradingScale.find((item) => total >= item.minimum);
  return band.grade;
}

module.exports = { gradingScale, gradeFor };
