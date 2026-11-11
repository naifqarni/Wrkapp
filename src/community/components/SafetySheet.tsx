/**
 * Everything a member can do to a post or a comment, in one sheet:
 * report it, block its author, or delete it when it is their own.
 * Report and block are the two controls app stores require next to every piece of member content.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { community as s } from '@/i18n/community';

import type { Author, ReportReason } from '../api/types';
import { can } from '../api/features';
import { errorText, useBlock, useDeleteComment, useDeletePost, useMemberGate, useReport, useSave } from '../state/hooks';
import { Button, color, font, Hairline, haptic, Icon, inputRTL, Row, Sheet, space, T } from '../ui/kit';
import { BadgeMark } from './BadgeMark';

export interface SafetyTarget {
  kind: 'post' | 'comment';
  id: string;
  postId: string;
  author: Author;
  mine: boolean;
  /** Posts only: whether it is in the member's saved list. Leave undefined to hide the row. */
  saved?: boolean;
}

type Step = 'menu' | 'report' | 'reported' | 'block' | 'delete';

export function useSafetySheet(opts: { onDeletedPost?: (id: string) => void; onBlocked?: (author: Author) => void } = {}) {
  const [target, setTarget] = useState<SafetyTarget | null>(null);
  const [visible, setVisible] = useState(false);
  const gate = useMemberGate();
  const open = useCallback(
    (t: SafetyTarget) => {
      // Reporting and blocking need an account; a signed-out reader is sent to verification.
      if (!t.mine && !gate({ rules: false })) return;
      setTarget(t);
      setVisible(true);
    },
    [gate],
  );
  const close = useCallback(() => setVisible(false), []);
  const element = target ? <SafetySheet key={`${target.kind}-${target.id}`} target={target} visible={visible} onClose={close} {...opts} /> : null;
  return { open, element };
}

function SafetySheet({
  target,
  visible,
  onClose,
  onDeletedPost,
  onBlocked,
}: {
  target: SafetyTarget;
  visible: boolean;
  onClose: () => void;
  onDeletedPost?: (id: string) => void;
  onBlocked?: (author: Author) => void;
}) {
  const [step, setStep] = useState<Step>(target.mine ? 'menu' : 'menu');
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const report = useReport();
  const block = useBlock();
  const delPost = useDeletePost();
  const delComment = useDeleteComment(target.postId);
  const save = useSave();
  const system = target.author.id === 'wrk';
  const canSave = target.kind === 'post' && target.saved !== undefined && can.save();
  const canBlock = !target.mine && !system && target.author.id !== 'deleted';

  const doBlock = () =>
    block.mutate(target.author, {
      onSuccess: () => {
        onClose();
        onBlocked?.(target.author);
      },
    });
  const doDelete = () => {
    const done = { onSuccess: () => { onClose(); if (target.kind === 'post') onDeletedPost?.(target.id); } };
    target.kind === 'post' ? delPost.mutate(target.id, done) : delComment.mutate(target.id, done);
  };
  const send = () => {
    if (!reason) return;
    setError(null);
    report.mutate(
      { target: { type: target.kind, id: target.id }, reason, note: note.trim() || undefined },
      {
        onSuccess: () => {
          haptic.success();
          setStep('reported');
        },
        onError: (e) => setError(errorText(e)),
      },
    );
  };

  const who = useMemo(
    () => (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <BadgeMark seed={target.author.handle} height={26} />
        <T v="label">{target.author.handle}</T>
      </View>
    ),
    [target.author.handle],
  );

  return (
    <Sheet visible={visible} onClose={onClose} testID="safety-sheet">
      {step === 'menu' && (
        <View>
          {canSave ? (
            <>
              <Row
                testID="action-save"
                label={target.saved ? s.actions.unsave : s.actions.save}
                onPress={() => {
                  save.mutate({ id: target.id, saved: !target.saved });
                  onClose();
                }}
              />
              <Hairline inset={space.gutter} />
            </>
          ) : null}
          {system ? null : target.mine ? (
            <Row testID="action-delete" label={s.actions.delete} danger onPress={() => setStep('delete')} />
          ) : (
            <>
              <Row testID="action-report" label={s.actions.report} onPress={() => setStep('report')} />
              {canBlock ? (
                <>
                  <Hairline inset={space.gutter} />
                  <Row testID="action-block" label={`${s.actions.block} ${target.author.handle}`} onPress={() => setStep('block')} />
                </>
              ) : null}
            </>
          )}
          {system ? null : <Hairline inset={space.gutter} />}
          <Row label={s.actions.cancel} onPress={onClose} />
        </View>
      )}

      {step === 'report' && (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 4 }}>
          <T v="title" style={{ paddingHorizontal: space.gutter, paddingBottom: 6 }}>{s.report.title}</T>
          {s.report.order.map((r) => (
            <Row
              key={r}
              testID={`reason-${r}`}
              label={s.report.reasons[r]}
              onPress={() => setReason(r)}
              end={<View style={{ width: 22 }}>{reason === r ? <Icon name="check" /> : null}</View>}
            />
          ))}
          <View style={{ paddingHorizontal: space.gutter, paddingTop: 6, gap: 14 }}>
            <TextInput
              testID="report-note"
              value={note}
              onChangeText={setNote}
              placeholder={s.report.notePlaceholder}
              placeholderTextColor={color.faint}
              maxLength={300}
              multiline
              style={[{ minHeight: 44, maxHeight: 96, borderBottomWidth: 1, borderBottomColor: color.line, fontFamily: font.body, fontSize: 16, color: color.ink, paddingVertical: 8 }, inputRTL]}
            />
            {error ? <T v="caption" danger>{error}</T> : null}
            <Button testID="report-send" label={s.report.send} onPress={send} disabled={!reason} loading={report.isPending} />
          </View>
        </ScrollView>
      )}

      {step === 'reported' && (
        <View style={{ paddingHorizontal: space.gutter, gap: 8 }} testID="report-done">
          <T v="title">{s.report.sentTitle}</T>
          <T mute>{s.report.sentBody}</T>
          <View style={{ gap: 10, marginTop: 14 }}>
            {canBlock ? <Button testID="report-also-block" variant="ghost" label={s.report.alsoBlock} onPress={doBlock} loading={block.isPending} /> : null}
            <Button testID="report-close" label={s.actions.done} onPress={onClose} />
          </View>
        </View>
      )}

      {step === 'block' && (
        <View style={{ paddingHorizontal: space.gutter, gap: 10 }}>
          <T v="title">{s.block.title}</T>
          {who}
          <T mute>{s.block.body}</T>
          <View style={{ gap: 10, marginTop: 12 }}>
            <Button testID="block-confirm" label={s.block.confirm} onPress={doBlock} loading={block.isPending} />
            <Button variant="quiet" label={s.actions.cancel} onPress={onClose} />
          </View>
        </View>
      )}

      {step === 'delete' && (
        <View style={{ paddingHorizontal: space.gutter, gap: 8 }}>
          <T v="title">{target.kind === 'post' ? s.actions.deletePostTitle : s.actions.deleteCommentTitle}</T>
          <T mute>{s.actions.deleteBody}</T>
          <View style={{ gap: 10, marginTop: 12 }}>
            <Button testID="delete-confirm" danger label={s.actions.delete} onPress={doDelete} loading={delPost.isPending || delComment.isPending} />
            <Button variant="quiet" label={s.actions.cancel} onPress={onClose} />
          </View>
        </View>
      )}
    </Sheet>
  );
}

/** Small yes/no sheet for the profile (sign out, new handle, delete account). */
export function ConfirmSheet({
  visible,
  title,
  body,
  confirm,
  danger,
  loading,
  onConfirm,
  onClose,
  testID,
}: {
  visible: boolean;
  title: string;
  body?: string;
  confirm: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  testID?: string;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} testID={testID}>
      <View style={{ paddingHorizontal: space.gutter, gap: 8 }}>
        <T v="title">{title}</T>
        {body ? <T mute>{body}</T> : null}
        <View style={{ gap: 10, marginTop: 12 }}>
          <Button testID={testID ? `${testID}-yes` : undefined} danger={danger} label={confirm} onPress={onConfirm} loading={loading} />
          <Button variant="quiet" label={s.actions.cancel} onPress={onClose} />
        </View>
      </View>
    </Sheet>
  );
}
