
export const fruit = { banana: 'yellow' }
export const fruits = { ...fruit, strawberry: 'red' }

function reportFruits() {
  console.log(fruits)
}

export default reportFruits
