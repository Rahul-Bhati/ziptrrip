/** A person a todo can be assigned to. Not a login account. */
export interface Person {
  id: number;
  name: string;
}

/** Data needed to insert a person. The name is already trimmed and validated. */
export interface CreatePersonData {
  name: string;
}
