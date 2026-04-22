
import styles from "./Submit.module.css"

function Submit({ btn1text, onClick, extraClass, id }) {
  return (
    <input 
      id={id}
      type="submit" 
      onClick={onClick} 
      value={btn1text} 
      className={`${styles.btn} ${extraClass || ""}`}
    />
  );
}

export {Submit}