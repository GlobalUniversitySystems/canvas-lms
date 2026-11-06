import React, {useState} from 'react'
import Modal from '@canvas/instui-bindings/react/InstuiModal'
import {Button} from '@instructure/ui-buttons'
import {IconPlusLine} from '@instructure/ui-icons'

// props : syncGrades: () => void;

export default function SyncCourseModal({syncGrades}) {
  const [isOpen, setIsOpen] = useState(false)

  function closeModal() {
    setIsOpen(false)
  }

  function onSubmitClick() {
    syncGrades()
    setIsOpen(false)
  }

  return (
    <span>
      <Modal
        open={isOpen}
        onDismiss={closeModal}
        size="small"
        label={'Sync Course'}
      >
        <Modal.Body>
            Are you sure to sync grades?
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={closeModal}>Cancel</Button> &nbsp;
          <Button color="primary" onClick={onSubmitClick} aria-label={'Sync grades to SIS'}>
                Yes Sync grades
          </Button>
        </Modal.Footer>
      </Modal>
      <Button color="primary" aria-label={'Sync grades to SIS'} onClick={() => setIsOpen(true)}>
          Sync grades to SIS
      </Button>
    </span>
  )
}
