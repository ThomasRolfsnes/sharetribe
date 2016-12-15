import { Component, PropTypes } from 'react';
import r, { button, div, a } from 'r-dom';
import Immutable from 'immutable';
import classNames from 'classnames';
import { t } from '../../../utils/i18n';
import { canUseDOM, canUsePushState } from '../../../utils/featureDetection';
import SideWinder from '../../composites/SideWinder/SideWinder';
import ManageAvailabilityHeader from '../../composites/ManageAvailabilityHeader/ManageAvailabilityHeader';
import ManageAvailabilityCalendar from '../../composites/ManageAvailabilityCalendar/ManageAvailabilityCalendar';
import FlashNotification from '../../composites/FlashNotification/FlashNotification';
import * as cssVariables from '../../../assets/styles/variables';

import css from './ManageAvailability.css';

const CALENDAR_RENDERING_TIMEOUT = 100;

const SaveButton = (props) => button({
  className: classNames({
    [css.saveButton]: true,
    [css.saveButtonVisible]: props.isVisible,
  }),
  disabled: props.isDisabled,
  onClick: props.onClick,
}, t('web.listings.save_and_close_availability_editing'));

SaveButton.propTypes = {
  isVisible: PropTypes.bool.isRequired,
  isDisabled: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
};

/**
   Return `true` if component should load initial data.
*/
const shouldLoad = (isOpen, prevIsOpen) => isOpen && !prevIsOpen;

/**
   Load initial data if needed. This should happen only once when
   component `isOpen` becomes `true`
*/
const loadInitialDataIfNeeded = (props, prevProps = null) => {
  const isOpen = props.isOpen;
  const prevIsOpen = prevProps && prevProps.isOpen;

  if (shouldLoad(isOpen, prevIsOpen)) {
    props.calendar.onMonthChanged(props.calendar.initialMonth);
  }
};

const setPushState = (state, title, path) => {
  if (canUseDOM && canUsePushState) {
    window.history.pushState(state, title, path);
  } else if (canUseDOM) {
    window.location.hash = path;
  }
};


class ManageAvailability extends Component {
  constructor(props) {
    super(props);
    this.state = { renderCalendar: false };

    this.clickHandler = this.clickHandler.bind(this);
  }

  componentDidMount() {
    // react-dates calendar height is often calculated incorrectly in
    // Safari when the SideWinder is shown. Rendering it
    // asynchronously allows the calendar to calculate the height
    // properly.
    // See: https://github.com/airbnb/react-dates/issues/46
    window.setTimeout(() => {
      this.setState({ renderCalendar: true }); // eslint-disable-line react/no-set-state
    }, CALENDAR_RENDERING_TIMEOUT);

    if (this.props.availability_link) {
      this.props.availability_link.addEventListener('click', this.clickHandler);
    }

    loadInitialDataIfNeeded(this.props);
  }

  componentWillUpdate(nextProps) {
    // manage location hash
    const containsHash = window.location.hash.indexOf('#manage-availability') >= 0;
    const href = window.location.href;
    const paramsIndex = href.indexOf('?');
    const searchPart = paramsIndex >= 0 ? href.substring(paramsIndex) : '';

    if (nextProps.isOpen && !containsHash) {
      const openPath = `${window.location.pathname}#manage-availability${searchPart}`;
      setPushState(null, 'Availability calendar is open', openPath);
    } else if (!nextProps.isOpen && containsHash) {
      setPushState(null, 'Availability calendar is closed', `${window.location.pathname}${searchPart}`);
    }
  }

  componentDidUpdate(prevProps) {
    loadInitialDataIfNeeded(this.props, prevProps);
  }

  componentWillUnmount() {
    if (this.props.availability_link) {
      this.props.availability_link.removeEventListener('click', this.clickHandler);
    }
  }

  clickHandler(e) {
    e.preventDefault();
    this.props.onOpen();
  }

  render() {
    const showCalendar = this.props.isOpen && this.state.renderCalendar;
    const defaultLink = a({
      href: '#',
      onClick: this.clickHandler,
    }, t('web.listings.edit_listing_availability'));
    const maybeRenderDefaultLink = this.props.availability_link ? null : defaultLink;

    const winder = {
      wrapper: this.props.sideWinderWrapper,
      maxWidth: cssVariables['--ManageAvailability_maxWidth'],
      minWidth: cssVariables['--ManageAvailability_minWidth'],
      isOpen: this.props.isOpen,
      onClose: () => {
        const explanation = t('web.listings.confirm_discarding_unsaved_availability_changes_explanation');
        const question = t('web.listings.confirm_discarding_unsaved_availability_changes_question');
        const text = `${explanation}\n\n${question}`;

        if (!this.props.hasChanges || window.confirm(text)) { // eslint-disable-line no-alert
          this.props.actions.closeEditView();
          if (typeof this.props.onCloseCallback === 'function') {
            this.props.onCloseCallback();
          }
        }
      },
    };


    return div([
      maybeRenderDefaultLink,
      r(SideWinder, winder, [
        div({ className: css.content }, [
          r(ManageAvailabilityHeader, this.props.header),
          showCalendar ? r(ManageAvailabilityCalendar, {
            ...this.props.calendar,
            extraClasses: css.calendar,
          }) : null,
          r(SaveButton, {
            isVisible: this.props.hasChanges,
            isDisabled: this.props.saveInProgress,
            onClick: this.props.onSave,
          }),
        ]),
      ]),
      r(FlashNotification, {
        actions: this.props.actions,
        messages: this.props.flashNotifications,
      }),
    ]);
  }
}

ManageAvailability.propTypes = {
  actions: PropTypes.shape({
    removeFlashNotification: PropTypes.func.isRequired,
    closeEditView: PropTypes.func.isRequired,
  }).isRequired,
  availability_link: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  flashNotifications: PropTypes.instanceOf(Immutable.List).isRequired,
  hasChanges: PropTypes.bool.isRequired,
  saveInProgress: PropTypes.bool.isRequired,
  onOpen: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onCloseCallback: PropTypes.func,
  isOpen: PropTypes.bool.isRequired,
  header: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  calendar: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  sideWinderWrapper: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
};

export default ManageAvailability;
