"use client";

import clsx from "clsx";
import {useOptimistic, useRef, useState, useTransition} from "react";
import {redirectToEntries, saveEntry, voteEntry} from "./EntryActions";
import { v4 as uuidv4 } from "uuid";
import {Entry} from "./types";
import {useRouter, useSearchParams} from "next/navigation";

type EntryState = {
  newEntry: Entry;
  updatedEntry?: Entry;
  pending: boolean;
  entered?: boolean;
};


export function EntryCreateForm() {
  let formRef = useRef<HTMLFormElement>(null);
  let [state, mutate] = useOptimistic(
      { pending: false },
      function createReducer(state, newEntry: EntryState) {
        if (newEntry.newEntry) {
          return {
            pending: newEntry.pending,
          };
        } else {
          return {
            pending: newEntry.pending,
          };
        }
      },
  );

  let entryStub = {
    id: uuidv4(),
    created_at: new Date().getTime(),
    end_at: new Date().getTime() + (7 * 24 * 60 * 60 * 1000), // expire in 7 days
    required_channel: "",
    title: "",
    option1: "",
  };
  let saveWithNewEntry = saveEntry.bind(null, entryStub);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let [isPending, startTransition] = useTransition();

  return (
      <>
        <div className="mx-8 w-full">
          <form
              className="relative my-8"
              ref={formRef}
              action={saveWithNewEntry}
              onSubmit={(event) => {
                event.preventDefault();
                let formData = new FormData(event.currentTarget);
                let newEntry = {
                  ...entryStub,
                  title: formData.get("title") as string,
                  option1: formData.get("option1") as string,
                };

                formRef.current?.reset();
                startTransition(async () => {
                  mutate({
                    newEntry,
                    pending: true,
                  });

                  await saveEntry(newEntry, formData);
                });
              }}
          >
            <input
                aria-label="Poll Title"
                className="pl-3 pr-28 py-3 mt-1 text-lg block w-full border border-gray-200 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring focus:ring-blue-300"
                maxLength={150}
                placeholder="Title..."
                required
                type="text"
                name="title"
            />
            <input
                aria-label="Option 1"
                className="pl-3 pr-28 py-3 mt-1 text-lg block w-full border border-gray-200 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring focus:ring-blue-300"
                maxLength={150}
                placeholder="Option 1"
                required
                type="text"
                name="option1"
            />
              <div className={"pt-2 flex justify-end"}>
                  <button
                      className={clsx(
                          "flex items-center p-1 justify-center px-4 h-10 text-lg border bg-blue-500 text-white rounded-md w-24 focus:outline-none focus:ring focus:ring-blue-300 hover:bg-blue-700 focus:bg-blue-700",
                          state.pending && "bg-gray-700 cursor-not-allowed",
                      )}
                      type="submit"
                      disabled={state.pending}
                  >
                      Create
                  </button>
              </div>
          </form>
        </div>
          <div className="w-full">
          </div>
      </>
  );
}

function EntryOptions({entry, onChange} : {entry: Entry, onChange: (index: number) => void}) {
    return (
        <div className="mb-4 text-left">
            {[entry.option1].filter(e => e !== "").map((option, index) => (
                <label key={index} className="block">
                    <input
                        type="radio"
                        name="entry"
                        value={option}
                        onChange={() => onChange(index + 1)}
                        className="mr-2"
                    />
                    {option}
                </label>
            ))}
        </div>
    );
}

function EntryResults({entry} : {entry: Entry}) {
    return (
        <div className="mb-4">
            <img src={`/api/image?id=${entry.id}&results=true&date=${Date.now()}`} alt='entry results'/>
        </div>
    );
}

export function EntryVoteForm({entry, viewResults}: { entry: Entry, viewResults?: boolean }) {
    const [selectedOption, setSelectedOption] = useState(-1);
    const router = useRouter();
    const searchParams = useSearchParams();
    viewResults = true;     // Only allow voting via the api
    let formRef = useRef<HTMLFormElement>(null);
    let voteOnEntry = voteEntry.bind(null, entry);
    let [isPending, startTransition] = useTransition();
    let [state, mutate] = useOptimistic(
        { showResults: viewResults },
        function createReducer({showResults}, state: EntryState) {
            if (state.entered || viewResults) {
                return {
                    showResults: true,
                };
            } else {
                return {
                    showResults: false,
                };
            }
        },
    );

    const handleVote = (index: number) => {
        setSelectedOption(index)
    };

    return (
        <div className="max-w-sm rounded overflow-hidden shadow-lg p-4 m-4">
            <div className="font-bold text-xl mb-2">{entry.title}</div>
            <form
                className="relative my-8"
                ref={formRef}
                action={ () => voteOnEntry(selectedOption)}
                onSubmit={(event) => {
                    event.preventDefault();
                    let formData = new FormData(event.currentTarget);
                    let newEntry = {
                        ...entry,
                    };

                    // @ts-ignore
                    newEntry[`votes${selectedOption}`] += 1;


                    formRef.current?.reset();
                    startTransition(async () => {
                        mutate({
                            newEntry,
                            pending: false,
                            entered: true,
                        });

                        await redirectToEntries();
                        // await votePoll(newEntry, selectedOption);
                    });
                }}
            >
                {state.showResults ? <EntryResults entry={entry}/> : <EntryOptions entry={entry} onChange={handleVote}/>}
                {state.showResults ? <button
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                        type="submit"
                    >Back</button> :
                    <button
                        className={"bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" + (selectedOption < 1 ? " cursor-not-allowed" : "")}
                        type="submit"
                        disabled={selectedOption < 1}
                    >
                        Vote
                    </button>
                }
            </form>
        </div>
);
}