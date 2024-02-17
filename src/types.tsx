export type School = {
  id: string,
  name: string,
  lat: number,
  lon: number,
}

export type EmployeeType = "Arzt" | "Assistent"

export type Employee = {
  id: string,
  name: string,
  lat: number,
  lon: number,
  type: EmployeeType,
}